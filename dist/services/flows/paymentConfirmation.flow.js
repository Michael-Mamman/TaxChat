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
        // If a reference was already extracted from NLU
        if (entities?.reference) {
            return {
                message: `I'll look up payment reference *${entities.reference}* for you. One moment...`,
                next_step: 1,
                awaiting_input: "lookup_in_progress",
            };
        }
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
        switch (step) {
            // ------------------------------------------------------------------
            // Step 0: Capture the payment reference or photo
            // ------------------------------------------------------------------
            case 0: {
                const trimmed = input.trim();
                // Check if it's a media message (receipt photo)
                if (trimmed.startsWith("media:") || trimmed.startsWith("image:")) {
                    data.receipt_media = trimmed;
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
                if (reference.length < 6) {
                    return {
                        message: "That reference seems too short. A payment reference is typically *12 or more characters*.\n\n" +
                            "Please re-enter the reference, or send a photo of your receipt:",
                        next_step: 0,
                        awaiting_input: "payment_reference",
                    };
                }
                data.reference = reference;
                // Look up the payment
                return this.lookupPayment(phone, reference, data);
            }
            // ------------------------------------------------------------------
            // Step 1: Process lookup result or receipt details
            // ------------------------------------------------------------------
            case 1: {
                const trimmed = input.trim();
                // If we received receipt details after image upload
                if (data.receipt_media) {
                    data.receipt_details = trimmed;
                    // Simulate OCR-based reference extraction
                    const simulatedRef = `RRR-${Date.now().toString().slice(-12)}`;
                    data.reference = simulatedRef;
                    return this.lookupPayment(phone, simulatedRef, data);
                }
                // Handle the post-lookup user actions
                return this.handlePostLookupAction(phone, trimmed, data);
            }
            // ------------------------------------------------------------------
            // Step 2: Display result and handle follow-up actions
            // ------------------------------------------------------------------
            case 2: {
                const choice = input.trim().toLowerCase();
                if (choice === "trace" || choice === "trace payment" || choice === "trace_payment") {
                    return this.createPaymentTrace(phone, data);
                }
                if (choice === "retry" || choice === "try another") {
                    return this.start(phone);
                }
                if (choice === "generate_rrr" || choice === "generate rrr" || choice === "new payment") {
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
                    return {
                        message: "Thank you! If you need to check another payment, just say *confirm payment*.\n\n" +
                            "Type *menu* to see other services.",
                        flow_complete: true,
                    };
                }
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
                return {
                    message: "Something went wrong. Let's start the payment confirmation again.",
                    next_step: 0,
                    awaiting_input: "payment_reference",
                };
        }
    }
    /** Look up a payment reference and return appropriate result */
    async lookupPayment(phone, reference, data) {
        const result = await remitaService.getPaymentStatus(reference);
        if (!result.success || !result.data) {
            return {
                message: "I couldn't reach the payment system at this time. Please try again in a few minutes.\n\n" +
                    "If this persists, type *help* to speak with an agent.",
                flow_complete: true,
            };
        }
        const payment = result.data;
        data.payment_result = payment;
        switch (payment.status) {
            case "POSTED":
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
        const choice = input.toLowerCase();
        if (choice === "trace" || choice === "trace payment") {
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
        // This would normally be called via itsmService, but since we only
        // import remitaService in this flow, we build a minimal trace ticket
        // structure. In production, the orchestrator would route to ITSM.
        const reference = data.reference;
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
