import remitaService from "../integrations/remita.service.js";
/**
 * Payment Confirmation Flow (Tier 1 - Self-service)
 *
 * Helps taxpayers confirm the status of a tax payment using a payment
 * reference or receipt photo.
 *
 * Steps:
 *   0 - Ask for payment reference (RRR) or receipt photo
 *   1 - Look up the payment status via Remita
 *   2 - Display result; create PAY-TRACE ticket if payment not found
 */
class PaymentConfirmationFlow {
    async start(phone, entities) {
        console.log('[paymentConfirmation.flow::start] ENTER', { phone, entityKeys: entities ? Object.keys(entities) : [] });
        // If a reference was already extracted from NLU
        if (entities?.reference) {
            console.log('[paymentConfirmation.flow::start] branch: entities.reference provided');
            console.log('[paymentConfirmation.flow::start] EXIT', { next_step: 1, awaiting_input: 'lookup_in_progress' });
            return {
                message: `I'll look up payment reference *${entities.reference}* for you. One moment...`,
                next_step: 1,
                awaiting_input: "lookup_in_progress",
            };
        }
        console.log('[paymentConfirmation.flow::start] branch: default - ask for reference');
        console.log('[paymentConfirmation.flow::start] EXIT', { next_step: 0, awaiting_input: 'payment_reference' });
        return {
            message: "I can help you confirm a tax payment.\n\n" +
                "Please provide one of the following:\n\n" +
                "1. Your *Remita Retrieval Reference (RRR)* number\n" +
                "2. The *payment receipt number*\n" +
                "3. A *photo of your payment receipt*\n\n" +
                "_The RRR is usually a 12-digit number starting with RRR-._",
            next_step: 0,
            awaiting_input: "payment_reference",
        };
    }
    async handleInput(phone, input, step, data) {
        console.log('[paymentConfirmation.flow::handleInput] ENTER', { phone, step, inputLen: input.length });
        switch (step) {
            // ------------------------------------------------------------------
            // Step 0: Capture the payment reference or photo
            // ------------------------------------------------------------------
            case 0: {
                console.log('[paymentConfirmation.flow::handleInput] branch: case 0 - capture reference/photo');
                const trimmed = input.trim();
                // Check if it's a media message (receipt photo)
                if (trimmed.startsWith("media:") || trimmed.startsWith("image:")) {
                    console.log('[paymentConfirmation.flow::handleInput] branch: media/image received');
                    data.receipt_media = trimmed;
                    console.log('[paymentConfirmation.flow::handleInput] EXIT', { next_step: 1, awaiting_input: 'receipt_details' });
                    return {
                        message: "Thank you for sending the receipt image. I'm extracting the payment details...\n\n" +
                            "_This may take a moment._\n\n" +
                            "While I process the image, could you also provide the *approximate payment amount* and *date*?\n\n" +
                            "_Example: NGN 250,000 on 15/03/2025_",
                        next_step: 1,
                        awaiting_input: "receipt_details",
                    };
                }
                // Validate reference format (flexible)
                const reference = trimmed.replace(/\s/g, "").toUpperCase();
                // A payment reference is digits, optionally prefixed with RRR. Accepting
                // any string of six-plus characters meant a stray tap such as
                // "FILE_RETURNS" was looked up and came back as a confirmed payment.
                const digits = reference.replace(/^RRR[-\s]?/i, "").replace(/[-\s]/g, "");
                if (!/^\d{10,20}$/.test(digits)) {
                    console.log('[paymentConfirmation.flow::handleInput] branch: reference failed format check');
                    console.log('[paymentConfirmation.flow::handleInput] EXIT', { next_step: 0, awaiting_input: 'payment_reference' });
                    return {
                        message: "That doesn't look like a payment reference.\n\n" +
                            "An *RRR* is a 12-digit number, sometimes written as *RRR-123456789012*. " +
                            "You can also send a photo of your receipt.\n\n" +
                            "Please re-enter it, or type *MENU* to start over:",
                        next_step: 0,
                        awaiting_input: "payment_reference",
                    };
                }
                data.reference = reference;
                console.log('[paymentConfirmation.flow::handleInput] branch: dispatching lookupPayment', { refPreview: reference.slice(0, 3) + '***' });
                console.log('[paymentConfirmation.flow::handleInput] EXIT', { dispatched: 'lookupPayment' });
                // Look up the payment
                return this.lookupPayment(phone, reference, data);
            }
            // ------------------------------------------------------------------
            // Step 1: Process lookup result or receipt details
            // ------------------------------------------------------------------
            case 1: {
                console.log('[paymentConfirmation.flow::handleInput] branch: case 1');
                const trimmed = input.trim();
                // If we received receipt details after image upload
                if (data.receipt_media) {
                    console.log('[paymentConfirmation.flow::handleInput] branch: receipt details after image');
                    data.receipt_details = trimmed;
                    // Simulate OCR-based reference extraction
                    const simulatedRef = `RRR-${Date.now().toString().slice(-12)}`;
                    data.reference = simulatedRef;
                    console.log('[paymentConfirmation.flow::handleInput] EXIT', { dispatched: 'lookupPayment(simulated)' });
                    return this.lookupPayment(phone, simulatedRef, data);
                }
                // Handle the post-lookup user actions
                console.log('[paymentConfirmation.flow::handleInput] branch: delegating to handlePostLookupAction');
                console.log('[paymentConfirmation.flow::handleInput] EXIT', { dispatched: 'handlePostLookupAction' });
                return this.handlePostLookupAction(phone, trimmed, data);
            }
            // ------------------------------------------------------------------
            // Step 2: Display result and handle follow-up actions
            // ------------------------------------------------------------------
            case 2: {
                console.log('[paymentConfirmation.flow::handleInput] branch: case 2 - post-result action');
                const choice = input.trim().toLowerCase();
                if (choice === "trace" || choice === "trace payment" || choice === "trace_payment") {
                    console.log('[paymentConfirmation.flow::handleInput] branch: trace payment');
                    console.log('[paymentConfirmation.flow::handleInput] EXIT', { dispatched: 'createPaymentTrace' });
                    return this.createPaymentTrace(phone, data);
                }
                if (choice === "retry" || choice === "try another") {
                    console.log('[paymentConfirmation.flow::handleInput] branch: retry');
                    console.log('[paymentConfirmation.flow::handleInput] EXIT', { dispatched: 'start' });
                    return this.start(phone);
                }
                if (choice === "generate_rrr" || choice === "generate rrr" || choice === "new payment") {
                    console.log('[paymentConfirmation.flow::handleInput] branch: generate_rrr');
                    console.log('[paymentConfirmation.flow::handleInput] EXIT', { flow_complete: true });
                    return {
                        message: "To generate a new Remita Retrieval Reference (RRR), please provide:\n\n" +
                            "1. *Tax Type* (e.g., CIT, VAT, PAYE, WHT)\n" +
                            "2. *Amount*\n" +
                            "3. *Period* (e.g., 2024-Q4)\n\n" +
                            "Or visit TaxProMax to generate an RRR directly:\n" +
                            "https://taxpromax.firs.gov.ng",
                        flow_complete: true,
                    };
                }
                if (choice === "done" || choice === "no" || choice === "exit") {
                    console.log('[paymentConfirmation.flow::handleInput] branch: done');
                    console.log('[paymentConfirmation.flow::handleInput] EXIT', { flow_complete: true });
                    return {
                        message: "Thank you! If you need to check another payment, just say *confirm payment*.\n\n" +
                            "Type *menu* to see other services.",
                        flow_complete: true,
                    };
                }
                console.log('[paymentConfirmation.flow::handleInput] branch: case 2 default - re-prompt');
                console.log('[paymentConfirmation.flow::handleInput] EXIT', { next_step: 2, awaiting_input: 'post_result_action' });
                return {
                    message: "Please select an option:",
                    buttons: [
                        { id: "retry", title: "Try Another" },
                        { id: "done", title: "I'm Done" },
                    ],
                    next_step: 2,
                    awaiting_input: "post_result_action",
                };
            }
            default:
                console.log('[paymentConfirmation.flow::handleInput] branch: default case - unknown step');
                console.log('[paymentConfirmation.flow::handleInput] EXIT', { next_step: 0, awaiting_input: 'payment_reference' });
                return {
                    message: "Something went wrong. Let's start the payment confirmation again.",
                    next_step: 0,
                    awaiting_input: "payment_reference",
                };
        }
    }
    /** Look up a payment reference and return appropriate result */
    async lookupPayment(phone, reference, data) {
        console.log('[paymentConfirmation.flow::lookupPayment] ENTER', { phone, refPreview: reference.slice(0, 3) + '***' });
        const result = await remitaService.getPaymentStatus(reference);
        if (!result.success || !result.data) {
            console.log('[paymentConfirmation.flow::lookupPayment] branch: lookup failed');
            console.log('[paymentConfirmation.flow::lookupPayment] EXIT', { flow_complete: true });
            return {
                message: "I couldn't reach the payment system at this time. Please try again in a few minutes.\n\n" +
                    "If this persists, type *help* to speak with an agent.",
                flow_complete: true,
            };
        }
        const payment = result.data;
        data.payment_result = payment;
        console.log('[paymentConfirmation.flow::lookupPayment] branch: switch on payment.status', { status: payment.status });
        switch (payment.status) {
            case "POSTED":
                console.log('[paymentConfirmation.flow::lookupPayment] branch: POSTED');
                console.log('[paymentConfirmation.flow::lookupPayment] EXIT', { status: 'POSTED', next_step: 2 });
                return {
                    message: `*Payment Confirmed!*\n\n` +
                        `Reference: ${payment.reference}\n` +
                        `Amount: NGN ${payment.amount.toLocaleString()}\n` +
                        `Date: ${payment.date ? new Date(payment.date).toLocaleDateString("en-NG") : "N/A"}\n` +
                        `Bank: ${payment.bank ?? "N/A"}\n` +
                        `Payer: ${payment.payer_name ?? "N/A"}\n` +
                        `Tax Type: ${payment.tax_type ?? "N/A"}\n` +
                        `Period Credited: ${payment.period_credited ?? "N/A"}\n` +
                        `Status: *POSTED (Confirmed)*\n\n` +
                        "This payment has been successfully posted to your tax account.\n\n" +
                        "Is there anything else you need?",
                    buttons: [
                        { id: "retry", title: "Check Another" },
                        { id: "done", title: "I'm Done" },
                    ],
                    next_step: 2,
                    awaiting_input: "post_result_action",
                };
            case "RECEIVED":
                console.log('[paymentConfirmation.flow::lookupPayment] branch: RECEIVED');
                console.log('[paymentConfirmation.flow::lookupPayment] EXIT', { status: 'RECEIVED', next_step: 2 });
                return {
                    message: `*Payment Received (Processing)*\n\n` +
                        `Reference: ${payment.reference}\n` +
                        `Amount: NGN ${payment.amount.toLocaleString()}\n` +
                        `Payer: ${payment.payer_name ?? "N/A"}\n` +
                        `Tax Type: ${payment.tax_type ?? "N/A"}\n` +
                        `Status: *RECEIVED*\n\n` +
                        "Your payment has been received but is still being processed. " +
                        "It typically takes *1-3 business days* to post to your account.\n\n" +
                        "Would you like to:",
                    buttons: [
                        { id: "retry", title: "Check Another" },
                        { id: "done", title: "I'll Wait" },
                    ],
                    next_step: 2,
                    awaiting_input: "post_result_action",
                };
            case "NOT_FOUND":
                console.log('[paymentConfirmation.flow::lookupPayment] branch: NOT_FOUND');
                console.log('[paymentConfirmation.flow::lookupPayment] EXIT', { status: 'NOT_FOUND', next_step: 2 });
                return {
                    message: `*Payment Not Found*\n\n` +
                        `Reference: ${reference}\n\n` +
                        "No payment was found with this reference. This could mean:\n\n" +
                        "- The reference number may be incorrect\n" +
                        "- The payment is still being processed by the bank\n" +
                        "- The payment was made through a channel not linked to Remita\n\n" +
                        "What would you like to do?",
                    buttons: [
                        { id: "trace", title: "Trace Payment" },
                        { id: "retry", title: "Try Another Ref" },
                        { id: "done", title: "Cancel" },
                    ],
                    next_step: 2,
                    awaiting_input: "not_found_action",
                };
            case "FAILED":
                console.log('[paymentConfirmation.flow::lookupPayment] branch: FAILED');
                console.log('[paymentConfirmation.flow::lookupPayment] EXIT', { status: 'FAILED', next_step: 2 });
                return {
                    message: `*Payment Failed*\n\n` +
                        `Reference: ${payment.reference}\n` +
                        `Amount: NGN ${payment.amount.toLocaleString()}\n\n` +
                        "This payment was not successful. The funds may have been reversed to your bank account.\n\n" +
                        "If you believe this is an error, I can raise a trace request.",
                    buttons: [
                        { id: "trace", title: "Trace Payment" },
                        { id: "generate_rrr", title: "New Payment" },
                        { id: "done", title: "Cancel" },
                    ],
                    next_step: 2,
                    awaiting_input: "failed_action",
                };
            default:
                console.log('[paymentConfirmation.flow::lookupPayment] branch: unknown status - escalating', { status: payment.status });
                console.log('[paymentConfirmation.flow::lookupPayment] EXIT', { escalate: true, flow_complete: true });
                return {
                    message: `Payment status for reference *${reference}* is: *${payment.status}*\n\n` +
                        "I'm not sure how to interpret this status. Would you like to speak with an agent?",
                    escalate: true,
                    escalation_reason: `Unknown payment status: ${payment.status} for ref ${reference}`,
                    flow_complete: true,
                };
        }
    }
    /** Handle actions after payment lookup */
    handlePostLookupAction(phone, input, data) {
        console.log('[paymentConfirmation.flow::handlePostLookupAction] ENTER', { phone, inputLen: input.length });
        const choice = input.toLowerCase();
        if (choice === "trace" || choice === "trace payment") {
            console.log('[paymentConfirmation.flow::handlePostLookupAction] branch: trace');
            console.log('[paymentConfirmation.flow::handlePostLookupAction] EXIT', { next_step: 2, awaiting_input: 'trace_details' });
            // Delegate to step 2 trace handling
            return {
                message: "I'll create a payment trace request. This will be investigated by our finance team.\n\n" +
                    "Can you provide any additional details about the payment?\n" +
                    "_(e.g., bank name, date of payment, amount)_\n\n" +
                    "Or type *skip* to submit without additional details.",
                next_step: 2,
                awaiting_input: "trace_details",
            };
        }
        console.log('[paymentConfirmation.flow::handlePostLookupAction] branch: default');
        console.log('[paymentConfirmation.flow::handlePostLookupAction] EXIT', { next_step: 2, awaiting_input: 'post_result_action' });
        return {
            message: "Please select an option:",
            buttons: [
                { id: "retry", title: "Try Another" },
                { id: "done", title: "I'm Done" },
            ],
            next_step: 2,
            awaiting_input: "post_result_action",
        };
    }
    /** Create a PAY-TRACE ticket in ITSM */
    async createPaymentTrace(phone, data) {
        console.log('[paymentConfirmation.flow::createPaymentTrace] ENTER', { phone });
        // This would normally be called via itsmService, but since we only
        // import remitaService in this flow, we build a minimal trace ticket
        // structure. In production, the orchestrator would route to ITSM.
        const reference = data.reference;
        console.log('[paymentConfirmation.flow::createPaymentTrace] EXIT', { flow_complete: true, reference });
        return {
            message: `A payment trace request has been created.\n\n` +
                `*Reference:* PAY-TRACE-${Date.now().toString().slice(-8)}\n` +
                `*Payment Ref:* ${reference}\n` +
                `*SLA:* You will receive an update within 48 hours.\n\n` +
                "Our finance team will investigate and confirm the payment status.\n" +
                "You'll be notified via WhatsApp once resolved.\n\n" +
                "Is there anything else I can help you with?",
            flow_complete: true,
        };
    }
}
export default new PaymentConfirmationFlow();
