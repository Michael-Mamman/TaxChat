import taxlyService from "../integrations/taxly.service.js";
import itsmService from "../integrations/itsm.service.js";
/**
 * WHT Credit Note Flow (Tier 2 - Requires NIN/BVN verification)
 *
 * Helps taxpayers request WHT credit notes.
 *
 * Steps:
 *   0 - Ask for WHT agent TIN or payment reference
 *   1 - Validate and fetch WHT details from Taxly
 *   2 - Collect credit note details (period, amount)
 *   3 - Review and submit
 *   4 - Create WHT-CN ITSM ticket
 */
class WHTCreditNoteFlow {
    async start(phone, entities) {
        // If NLU already extracted a reference, jump to lookup
        if (entities?.reference) {
            return {
                message: `I'll look up WHT payment reference *${entities.reference}*. One moment...`,
                next_step: 1,
                awaiting_input: "lookup_in_progress",
                requires_auth_tier: 2,
            };
        }
        // If NLU extracted a TIN (likely the WHT agent's TIN)
        if (entities?.tin && /^\d{10}$/.test(entities.tin)) {
            return {
                message: `I'll look up WHT deductions by agent TIN *${entities.tin.slice(0, 3)}****${entities.tin.slice(-2)}*. One moment...`,
                next_step: 1,
                awaiting_input: "lookup_in_progress",
                requires_auth_tier: 2,
            };
        }
        return {
            message: "I can help you request a Withholding Tax (WHT) credit note.\n\n" +
                "A credit note confirms that WHT was deducted from a payment made to you " +
                "and remitted to the tax authority by the deducting party.\n\n" +
                "How would you like to look up the WHT deduction?",
            buttons: [
                { id: "by_agent_tin", title: "WHT Agent TIN" },
                { id: "by_reference", title: "Payment Reference" },
            ],
            next_step: 0,
            awaiting_input: "lookup_method",
            requires_auth_tier: 2,
        };
    }
    async handleInput(phone, input, step, data) {
        switch (step) {
            // ------------------------------------------------------------------
            // Step 0: Collect WHT agent TIN or payment reference
            // ------------------------------------------------------------------
            case 0: {
                const trimmed = input.trim().toLowerCase();
                if (trimmed === "by_agent_tin" || trimmed === "wht agent tin") {
                    data.lookup_method = "agent_tin";
                    return {
                        message: "Please provide the *TIN of the WHT deducting party* (agent):\n\n" +
                            "_This is the 10-digit TIN of the company or government agency that deducted WHT from your payment._",
                        next_step: 1,
                        awaiting_input: "agent_tin",
                    };
                }
                if (trimmed === "by_reference" || trimmed === "payment reference") {
                    data.lookup_method = "reference";
                    return {
                        message: "Please provide the *payment or invoice reference* related to the WHT deduction:\n\n" +
                            "_This could be the invoice number, contract reference, or e-invoice reference from Taxly._",
                        next_step: 1,
                        awaiting_input: "payment_reference",
                    };
                }
                // Handle retry and raise_ticket from not-found result
                if (trimmed === "retry" || trimmed === "try again") {
                    return this.start(phone);
                }
                if (trimmed === "raise_ticket" || trimmed === "raise support ticket" || trimmed === "follow up on remittance") {
                    return {
                        message: "Please briefly describe your WHT issue so I can create a support ticket:\n\n" +
                            "_Example: \"WHT of NGN 250,000 deducted by ABC Company (TIN 1234567890) in January 2025 has not been remitted\"_",
                        next_step: 4,
                        awaiting_input: "support_description",
                    };
                }
                if (trimmed === "done" || trimmed === "i'm done") {
                    return {
                        message: "Thank you! If you need help with WHT credit notes in the future, just say *WHT credit note*.\n\n" +
                            "Type *menu* to see other services.",
                        flow_complete: true,
                    };
                }
                // User typed a TIN directly
                const cleanInput = input.trim().replace(/[\s-]/g, "");
                if (/^\d{10}$/.test(cleanInput)) {
                    data.lookup_method = "agent_tin";
                    data.agent_tin = cleanInput;
                    return this.lookupWHTDeduction(phone, data);
                }
                // User typed a reference directly
                if (cleanInput.length >= 5) {
                    data.lookup_method = "reference";
                    data.payment_reference = input.trim();
                    return this.lookupWHTDeduction(phone, data);
                }
                return {
                    message: "I didn't understand that. Please select how you'd like to look up the WHT deduction:",
                    buttons: [
                        { id: "by_agent_tin", title: "WHT Agent TIN" },
                        { id: "by_reference", title: "Payment Reference" },
                    ],
                    next_step: 0,
                    awaiting_input: "lookup_method",
                };
            }
            // ------------------------------------------------------------------
            // Step 1: Validate and fetch WHT details from Taxly
            // ------------------------------------------------------------------
            case 1: {
                const trimmed = input.trim();
                const lookupMethod = data.lookup_method;
                // Validate input based on lookup method
                if (lookupMethod === "agent_tin" && !data.agent_tin) {
                    const tin = trimmed.replace(/[\s-]/g, "");
                    if (!/^\d{10}$/.test(tin)) {
                        return {
                            message: "A TIN must be exactly *10 digits*. Please re-enter the WHT agent's TIN:",
                            next_step: 1,
                            awaiting_input: "agent_tin",
                        };
                    }
                    data.agent_tin = tin;
                }
                else if (lookupMethod === "reference" && !data.payment_reference) {
                    if (trimmed.length < 5) {
                        return {
                            message: "That reference seems too short. Please enter a valid payment or invoice reference:",
                            next_step: 1,
                            awaiting_input: "payment_reference",
                        };
                    }
                    data.payment_reference = trimmed;
                }
                return this.lookupWHTDeduction(phone, data);
            }
            // ------------------------------------------------------------------
            // Step 2: Collect credit note details (period, amount)
            // ------------------------------------------------------------------
            case 2: {
                const trimmed = input.trim();
                // Handle action buttons from WHT detail display
                if (trimmed.toLowerCase() === "proceed" || trimmed.toLowerCase() === "request credit note") {
                    return {
                        message: "Please provide the following details for the credit note request.\n\n" +
                            "Reply with each on a separate line:\n\n" +
                            "1. *Tax period* to credit (e.g., 2025-Q1)\n" +
                            "2. *Your TIN* (10 digits)\n\n" +
                            "_Example:_\n" +
                            "2025-Q1\n" +
                            "1234567890",
                        next_step: 2,
                        awaiting_input: "credit_details",
                    };
                }
                if (trimmed.toLowerCase() === "done" || trimmed.toLowerCase() === "i'm done") {
                    return {
                        message: "Thank you! If you need a WHT credit note in the future, just say *WHT credit note*.\n\n" +
                            "Type *menu* to see other services.",
                        flow_complete: true,
                    };
                }
                // Parse credit note details
                return this.parseCreditDetails(trimmed, data);
            }
            // ------------------------------------------------------------------
            // Step 3: Review and confirm submission
            // ------------------------------------------------------------------
            case 3: {
                const choice = input.trim().toLowerCase();
                if (choice === "cancel" || choice === "no") {
                    return {
                        message: "The credit note request has been cancelled.\n\n" +
                            "If you need help with WHT credit notes in the future, just say *WHT credit note*.\n\n" +
                            "Type *menu* to see other services.",
                        flow_complete: true,
                    };
                }
                if (choice === "edit" || choice === "edit details") {
                    data.credit_period = undefined;
                    data.taxpayer_tin = undefined;
                    return {
                        message: "Let's update the details. Please provide:\n\n" +
                            "1. *Tax period* to credit (e.g., 2025-Q1)\n" +
                            "2. *Your TIN* (10 digits)\n\n" +
                            "Each on a separate line:",
                        next_step: 2,
                        awaiting_input: "credit_details",
                    };
                }
                if (choice === "confirm" || choice === "submit" || choice === "confirm & submit" || choice === "yes") {
                    return this.submitCreditNoteRequest(phone, data);
                }
                return {
                    message: "Please confirm your credit note request:",
                    buttons: [
                        { id: "confirm", title: "Confirm & Submit" },
                        { id: "edit", title: "Edit Details" },
                        { id: "cancel", title: "Cancel" },
                    ],
                    next_step: 3,
                    awaiting_input: "confirmation",
                };
            }
            // ------------------------------------------------------------------
            // Step 4: Create WHT-CN ITSM ticket (post-submission or support)
            // ------------------------------------------------------------------
            case 4: {
                const trimmed = input.trim();
                const choice = trimmed.toLowerCase();
                if (choice === "another" || choice === "request another") {
                    return this.start(phone);
                }
                if (choice === "done" || choice === "i'm done") {
                    return {
                        message: "Thank you! If you need another credit note, just say *WHT credit note*.\n\n" +
                            "Type *menu* to see other services.",
                        flow_complete: true,
                    };
                }
                // Handle support ticket creation for unremitted WHT or general issues
                if (trimmed.length >= 10) {
                    const ticketResult = await itsmService.createTicket({
                        type: "WHT-CN",
                        subject: `WHT Credit Note Support - Phone ${phone}`,
                        description: `Phone: ${phone}\n` +
                            `Agent TIN: ${data.agent_tin ?? "N/A"}\n` +
                            `Payment Reference: ${data.payment_reference ?? "N/A"}\n\n` +
                            `Issue Description:\n${trimmed}`,
                        phone,
                        priority: "medium",
                    });
                    if (!ticketResult.success) {
                        return {
                            message: "I'm sorry, there was an issue creating your support ticket.\n\n" +
                                "Please try again later or type *help* to speak with an agent.",
                            flow_complete: true,
                        };
                    }
                    return {
                        message: `Your WHT support ticket has been created.\n\n` +
                            `*Ticket Reference:* ${ticketResult.data.reference}\n` +
                            `*SLA:* You will receive a response within 48 hours.\n\n` +
                            "A tax officer will investigate and contact you.\n\n" +
                            "Is there anything else I can help you with?",
                        flow_complete: true,
                    };
                }
                return {
                    message: "Thank you! If you need another credit note, just say *WHT credit note*.\n\n" +
                        "Type *menu* to see other services.",
                    flow_complete: true,
                };
            }
            default:
                return {
                    message: "Something went wrong. Let's start the WHT credit note request again.",
                    next_step: 0,
                    awaiting_input: "lookup_method",
                };
        }
    }
    /** Look up WHT deduction details from Taxly */
    async lookupWHTDeduction(phone, data) {
        const lookupMethod = data.lookup_method;
        const reference = lookupMethod === "reference"
            ? data.payment_reference
            : data.agent_tin;
        try {
            const result = await taxlyService.verifyEInvoice(reference);
            if (!result.success || !result.data) {
                return {
                    message: "I couldn't find any WHT deduction records matching your input.\n\n" +
                        "This could mean:\n" +
                        "- The reference or TIN may be incorrect\n" +
                        "- The WHT has not yet been remitted by the deducting party\n" +
                        "- The e-invoice has not been registered on Taxly\n\n" +
                        "Would you like to try again or raise a support ticket?",
                    buttons: [
                        { id: "retry", title: "Try Again" },
                        { id: "raise_ticket", title: "Raise Support Ticket" },
                        { id: "done", title: "I'm Done" },
                    ],
                    next_step: 0,
                    awaiting_input: "not_found_action",
                };
            }
            const whtData = result.data;
            data.selected_wht = whtData;
            const remittedStatus = whtData.is_remitted ? "REMITTED" : "NOT YET REMITTED";
            return {
                message: `*WHT Deduction Found*\n\n` +
                    `Deducting Party: ${whtData.deducting_party_name}\n` +
                    `Agent TIN: ${whtData.deducting_party_tin}\n` +
                    `Gross Amount: NGN ${whtData.amount.toLocaleString()}\n` +
                    `WHT Deducted: NGN ${whtData.wht_amount.toLocaleString()}\n` +
                    `Date: ${whtData.date}\n` +
                    `Invoice Ref: ${whtData.invoice_reference ?? "N/A"}\n` +
                    `Remittance Status: *${remittedStatus}*\n` +
                    (whtData.verification_url ? `Verification: ${whtData.verification_url}\n` : "") +
                    "\n" +
                    (whtData.is_remitted
                        ? "This WHT has been remitted. You can proceed with a credit note request.\n\n" +
                            "Would you like to request a credit note?"
                        : "This WHT has *not yet been remitted* by the deducting party. " +
                            "A credit note can only be issued after remittance.\n\n" +
                            "Would you like to raise a ticket to follow up on the remittance?"),
                buttons: whtData.is_remitted
                    ? [
                        { id: "proceed", title: "Request Credit Note" },
                        { id: "done", title: "I'm Done" },
                    ]
                    : [
                        { id: "raise_ticket", title: "Follow Up on Remittance" },
                        { id: "done", title: "I'm Done" },
                    ],
                next_step: whtData.is_remitted ? 2 : 0,
                awaiting_input: whtData.is_remitted ? "credit_note_action" : "remittance_action",
            };
        }
        catch {
            return {
                message: "I encountered an error while looking up the WHT deduction.\n\n" +
                    "Please try again later or type *help* to speak with an agent.",
                flow_complete: true,
            };
        }
    }
    /** Parse the credit note details from user input */
    parseCreditDetails(input, data) {
        const lines = input
            .trim()
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
        if (lines.length < 2) {
            return {
                message: "I need both pieces of information on separate lines:\n\n" +
                    "1. *Tax period* (e.g., 2025-Q1)\n" +
                    "2. *Your TIN* (10 digits)\n\n" +
                    "Please try again:",
                next_step: 2,
                awaiting_input: "credit_details",
            };
        }
        const [period, tin] = lines;
        // Validate period format
        if (!/^\d{4}(-Q[1-4]|-\d{2})?$/.test(period)) {
            return {
                message: "The period format doesn't look right. Please use one of these formats:\n\n" +
                    "- *YYYY-Q1* through *YYYY-Q4* (quarterly)\n" +
                    "- *YYYY-MM* (monthly)\n" +
                    "- *YYYY* (annual)\n\n" +
                    "Please provide both details again:\n" +
                    "1. Tax period\n" +
                    "2. Your TIN",
                next_step: 2,
                awaiting_input: "credit_details",
            };
        }
        // Validate TIN
        const cleanTin = tin.replace(/[\s-]/g, "");
        if (!/^\d{10}$/.test(cleanTin)) {
            return {
                message: "The TIN must be exactly *10 digits*. Please provide both details again:\n\n" +
                    "1. Tax period\n" +
                    "2. Your TIN (10 digits)",
                next_step: 2,
                awaiting_input: "credit_details",
            };
        }
        data.credit_period = period;
        data.taxpayer_tin = cleanTin;
        // Build review summary
        const wht = data.selected_wht;
        return {
            message: `*Credit Note Request Summary*\n\n` +
                `Deducting Party: ${wht.deducting_party_name}\n` +
                `Agent TIN: ${wht.deducting_party_tin}\n` +
                `Gross Payment: NGN ${wht.amount.toLocaleString()}\n` +
                `WHT Amount: NGN ${wht.wht_amount.toLocaleString()}\n` +
                `Payment Date: ${wht.date}\n` +
                `Invoice Ref: ${wht.invoice_reference ?? "N/A"}\n\n` +
                `*Credit To:*\n` +
                `Your TIN: ${cleanTin.slice(0, 3)}****${cleanTin.slice(-2)}\n` +
                `Period: ${period}\n\n` +
                "Is everything correct?",
            buttons: [
                { id: "confirm", title: "Confirm & Submit" },
                { id: "edit", title: "Edit Details" },
                { id: "cancel", title: "Cancel" },
            ],
            next_step: 3,
            awaiting_input: "confirmation",
        };
    }
    /** Submit credit note request and create WHT-CN ITSM ticket */
    async submitCreditNoteRequest(phone, data) {
        const wht = data.selected_wht;
        const taxpayerTin = data.taxpayer_tin;
        const creditPeriod = data.credit_period;
        const ticketResult = await itsmService.createTicket({
            type: "WHT-CN",
            subject: `WHT Credit Note Request - TIN ${taxpayerTin} - NGN ${wht.wht_amount.toLocaleString()}`,
            description: `Taxpayer TIN: ${taxpayerTin}\n` +
                `Phone: ${phone}\n` +
                `Credit Period: ${creditPeriod}\n\n` +
                `WHT Deduction Details:\n` +
                `  Deducting Party: ${wht.deducting_party_name}\n` +
                `  Agent TIN: ${wht.deducting_party_tin}\n` +
                `  Gross Amount: NGN ${wht.amount.toLocaleString()}\n` +
                `  WHT Amount: NGN ${wht.wht_amount.toLocaleString()}\n` +
                `  Date: ${wht.date}\n` +
                `  Invoice Ref: ${wht.invoice_reference ?? "N/A"}\n` +
                `  Credit Note ID: ${wht.credit_note_id}`,
            taxpayer_tin: taxpayerTin,
            phone,
            priority: "medium",
        });
        if (!ticketResult.success) {
            return {
                message: "I'm sorry, there was an issue submitting your credit note request.\n\n" +
                    "Please try again later or visit your nearest FIRS office with your WHT deduction evidence.\n\n" +
                    "If the problem persists, type *help* to speak with an agent.",
                flow_complete: true,
            };
        }
        return {
            message: `Your WHT credit note request has been submitted successfully!\n\n` +
                `*Ticket Reference:* ${ticketResult.data.reference}\n` +
                `*WHT Amount:* NGN ${wht.wht_amount.toLocaleString()}\n` +
                `*Credit Period:* ${creditPeriod}\n` +
                `*Deducting Party:* ${wht.deducting_party_name}\n` +
                `*SLA:* 3-5 business days for processing\n\n` +
                "Once approved, the WHT credit note will be posted to your tax account " +
                "and can be used to offset your tax liability for the specified period.\n\n" +
                `You can check your request status anytime by saying:\n` +
                `"_Check status of ${ticketResult.data.reference}_"\n\n` +
                "Is there anything else I can help you with?",
            buttons: [
                { id: "another", title: "Request Another" },
                { id: "done", title: "I'm Done" },
            ],
            next_step: 4,
            awaiting_input: "post_submit_action",
        };
    }
}
export default new WHTCreditNoteFlow();
