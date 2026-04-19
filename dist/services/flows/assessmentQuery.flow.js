import taxProMaxService from "../integrations/taxpromax.service.js";
import itsmService from "../integrations/itsm.service.js";
/**
 * Assessment Query Flow (Tier 1 - Self-service)
 *
 * Helps taxpayers check tax assessments and outstanding liabilities.
 *
 * Steps:
 *   0 - Ask query type (View Assessment / Check Outstanding / Request Review)
 *   1 - Fetch assessment data via taxpromax
 *   2 - Display results and offer dispute option
 *   3 - Create ITSM ticket for dispute (ASMT-REV)
 */
class AssessmentQueryFlow {
    async start(phone, entities) {
        // If NLU already extracted a query type, advance
        if (entities?.query_type) {
            const queryType = entities.query_type.toLowerCase();
            const validTypes = ["view_assessment", "check_outstanding", "request_review"];
            if (validTypes.includes(queryType)) {
                return {
                    message: `I'll help you with that. Please provide your *TIN (Taxpayer Identification Number)*:\n\n` +
                        "_Your TIN is the 10-digit number on your tax documents._",
                    next_step: 1,
                    awaiting_input: "tin",
                };
            }
        }
        // If NLU extracted a TIN, skip the query type selection and show options with TIN pre-loaded
        if (entities?.tin && /^\d{10}$/.test(entities.tin)) {
            return {
                message: `I found TIN *${entities.tin.slice(0, 3)}****${entities.tin.slice(-2)}*. What would you like to do?`,
                menu_options: [
                    {
                        id: "view_assessment",
                        title: "View Assessments",
                        description: "See all assessments on your account",
                    },
                    {
                        id: "check_outstanding",
                        title: "Check Outstanding",
                        description: "View unpaid balances",
                    },
                    {
                        id: "request_review",
                        title: "Request Review",
                        description: "Dispute or request reassessment",
                    },
                ],
                next_step: 0,
                awaiting_input: "query_type",
            };
        }
        return {
            message: "I can help you with your tax assessments.\n\n" +
                "What would you like to do?",
            menu_options: [
                {
                    id: "view_assessment",
                    title: "View Assessments",
                    description: "See all assessments on your account",
                },
                {
                    id: "check_outstanding",
                    title: "Check Outstanding",
                    description: "View unpaid balances and liabilities",
                },
                {
                    id: "request_review",
                    title: "Request Review",
                    description: "Dispute an assessment or request reassessment",
                },
            ],
            next_step: 0,
            awaiting_input: "query_type",
        };
    }
    async handleInput(phone, input, step, data) {
        switch (step) {
            // ------------------------------------------------------------------
            // Step 0: Capture query type
            // ------------------------------------------------------------------
            case 0: {
                const queryType = input.trim().toLowerCase();
                const validTypes = ["view_assessment", "check_outstanding", "request_review"];
                if (!validTypes.includes(queryType)) {
                    return {
                        message: "Please select one of the options below:",
                        menu_options: [
                            { id: "view_assessment", title: "View Assessments", description: "See all assessments on your account" },
                            { id: "check_outstanding", title: "Check Outstanding", description: "View unpaid balances" },
                            { id: "request_review", title: "Request Review", description: "Dispute or request reassessment" },
                        ],
                        next_step: 0,
                        awaiting_input: "query_type",
                    };
                }
                data.query_type = queryType;
                return {
                    message: "Please provide your *TIN (Taxpayer Identification Number)*:\n\n" +
                        "_Your TIN is the 10-digit number on your tax documents._",
                    next_step: 1,
                    awaiting_input: "tin",
                };
            }
            // ------------------------------------------------------------------
            // Step 1: Collect TIN and fetch assessment data via TaxProMax
            // ------------------------------------------------------------------
            case 1: {
                const tin = input.trim().replace(/[\s-]/g, "");
                if (!/^\d{10}$/.test(tin)) {
                    return {
                        message: "A TIN must be exactly *10 digits*. Please re-enter your TIN:",
                        next_step: 1,
                        awaiting_input: "tin",
                    };
                }
                data.tin = tin;
                const queryType = data.query_type;
                // Determine which service call to make based on query type
                if (queryType === "check_outstanding") {
                    return this.fetchOutstandingLiabilities(phone, tin, data);
                }
                // For view_assessment and request_review, fetch all assessments
                return this.fetchAssessments(phone, tin, data);
            }
            // ------------------------------------------------------------------
            // Step 2: Display results and offer dispute / follow-up options
            // ------------------------------------------------------------------
            case 2: {
                const choice = input.trim().toLowerCase();
                if (choice === "done" || choice === "i'm done" || choice === "no" || choice === "exit") {
                    return {
                        message: "Thank you! If you need to check your assessments again, just say *check my assessment*.\n\n" +
                            "Type *menu* to see other services.",
                        flow_complete: true,
                    };
                }
                if (choice === "pay" || choice === "make payment" || choice === "pay_now") {
                    const assessments = data.assessments;
                    const outstanding = assessments?.filter((a) => a.balance > 0) ?? [];
                    const total = outstanding.reduce((sum, a) => sum + a.balance, 0);
                    return {
                        message: `Your total outstanding balance is *NGN ${total.toLocaleString()}*.\n\n` +
                            "To make a payment:\n" +
                            "1. Visit https://remita.net or any Remita-enabled bank\n" +
                            "2. Use the payment references below:\n\n" +
                            outstanding
                                .map((a) => `- *${a.tax_type}*: NGN ${a.balance.toLocaleString()} (Ref: ${a.reference ?? "N/A"})`)
                                .join("\n") +
                            "\n\nOnce payment is made, say *confirm payment* to verify.\n\n" +
                            "Is there anything else I can help you with?",
                        buttons: [
                            { id: "confirm_payment", title: "Confirm a Payment" },
                            { id: "done", title: "I'm Done" },
                        ],
                        next_step: 2,
                        awaiting_input: "payment_action",
                    };
                }
                if (choice === "confirm_payment" || choice === "confirm a payment") {
                    return {
                        message: "I'll redirect you to the Payment Confirmation service.\n\n" +
                            "_You can also say \"confirm payment\" at any time._",
                        flow_complete: true,
                    };
                }
                if (choice === "dispute" || choice === "dispute assessment" || choice === "request_review") {
                    const assessments = data.assessments;
                    if (assessments && assessments.length > 0) {
                        const listing = assessments.map((a, i) => `${i + 1}. *${a.tax_type}* (${a.period ?? `Year ${a.tax_year}`}) - NGN ${a.assessed_amount.toLocaleString()} (Ref: ${a.reference ?? "N/A"})`).join("\n");
                        data.dispute_options = assessments;
                        return {
                            message: "Which assessment would you like to dispute?\n\n" +
                                listing +
                                "\n\nPlease reply with the number of the assessment, or type *all* to dispute all:",
                            next_step: 3,
                            awaiting_input: "dispute_selection",
                        };
                    }
                    return {
                        message: "Please describe the assessment you wish to dispute.\n\n" +
                            "Include the assessment reference, tax type, and reason for dispute:\n\n" +
                            "_Example: \"I disagree with VAT assessment NRS/ASS/2024/00456 - the amount is overstated\"_",
                        next_step: 3,
                        awaiting_input: "dispute_description",
                    };
                }
                if (choice === "download" || choice === "download statement") {
                    return {
                        message: "Your assessment statement is being generated and will be sent as a PDF in this chat shortly.\n\n" +
                            "Is there anything else I can help you with?",
                        buttons: [
                            { id: "dispute", title: "Dispute Assessment" },
                            { id: "done", title: "I'm Done" },
                        ],
                        next_step: 2,
                        awaiting_input: "post_download_action",
                    };
                }
                return {
                    message: "Please select an option:",
                    buttons: this.getResultActionButtons(data),
                    next_step: 2,
                    awaiting_input: "result_action",
                };
            }
            // ------------------------------------------------------------------
            // Step 3: Create ITSM ticket for dispute (ASMT-REV)
            // ------------------------------------------------------------------
            case 3: {
                const trimmed = input.trim();
                const tin = data.tin ?? "N/A";
                // Handle numeric selection from dispute options
                const disputeOptions = data.dispute_options;
                let disputeDescription;
                if (disputeOptions && disputeOptions.length > 0 && !data.dispute_description) {
                    if (trimmed.toLowerCase() === "all") {
                        disputeDescription = disputeOptions.map((a) => `${a.tax_type} (${a.period ?? `Year ${a.tax_year}`}) - Ref: ${a.reference ?? a.assessment_id} - NGN ${a.assessed_amount.toLocaleString()}`).join("\n");
                        data.disputed_assessments = disputeOptions;
                    }
                    else {
                        const selection = parseInt(trimmed, 10);
                        if (isNaN(selection) || selection < 1 || selection > disputeOptions.length) {
                            return {
                                message: `Please reply with a number between *1* and *${disputeOptions.length}*, or type *all*:`,
                                next_step: 3,
                                awaiting_input: "dispute_selection",
                            };
                        }
                        const selected = disputeOptions[selection - 1];
                        disputeDescription =
                            `${selected.tax_type} (${selected.period ?? `Year ${selected.tax_year}`}) - Ref: ${selected.reference ?? selected.assessment_id} - NGN ${selected.assessed_amount.toLocaleString()}`;
                        data.disputed_assessments = [selected];
                    }
                    // Ask for reason
                    data.dispute_description = disputeDescription;
                    return {
                        message: `You selected the following for dispute:\n\n${disputeDescription}\n\n` +
                            "Please provide the *reason for your dispute*:\n\n" +
                            "_Example: \"The assessed amount does not reflect the actual turnover for the period\"_",
                        next_step: 3,
                        awaiting_input: "dispute_reason",
                    };
                }
                // Collecting the dispute reason (second pass through step 3)
                if (data.dispute_description && !data.dispute_reason) {
                    if (trimmed.length < 10) {
                        return {
                            message: "Please provide a more detailed reason for your dispute so we can assist you effectively:",
                            next_step: 3,
                            awaiting_input: "dispute_reason",
                        };
                    }
                    data.dispute_reason = trimmed;
                    disputeDescription = data.dispute_description;
                }
                else if (!data.dispute_description) {
                    // Free-text dispute description (no prior selection)
                    if (trimmed.length < 10) {
                        return {
                            message: "Please provide more detail about the assessment you wish to dispute:\n\n" +
                                "_Include the assessment reference, tax type, and reason._",
                            next_step: 3,
                            awaiting_input: "dispute_description",
                        };
                    }
                    disputeDescription = trimmed;
                    data.dispute_description = trimmed;
                    data.dispute_reason = trimmed;
                }
                else {
                    disputeDescription = data.dispute_description;
                    if (!data.dispute_reason) {
                        data.dispute_reason = trimmed;
                    }
                }
                // Create the ITSM ticket
                const ticketResult = await itsmService.createTicket({
                    type: "ASMT-REV",
                    subject: `Assessment Review Request - TIN ${tin}`,
                    description: `TIN: ${tin}\n` +
                        `Phone: ${phone}\n\n` +
                        `Assessment(s) Disputed:\n${disputeDescription}\n\n` +
                        `Reason:\n${data.dispute_reason}`,
                    taxpayer_tin: tin,
                    phone,
                    priority: "medium",
                });
                if (!ticketResult.success) {
                    return {
                        message: "I'm sorry, there was an issue submitting your dispute request.\n\n" +
                            "Please try again later or visit your nearest FIRS office.\n\n" +
                            "If the problem persists, type *help* to speak with an agent.",
                        flow_complete: true,
                    };
                }
                return {
                    message: `Your assessment review request has been submitted successfully!\n\n` +
                        `*Ticket Reference:* ${ticketResult.data.reference}\n` +
                        `*Type:* Assessment Dispute (ASMT-REV)\n` +
                        `*SLA:* You will receive a response within 5 business days.\n\n` +
                        "A reviewing officer will examine the assessment and may contact you for additional documentation.\n\n" +
                        `You can check your ticket status anytime by saying:\n` +
                        `"_Check status of ${ticketResult.data.reference}_"\n\n` +
                        "Is there anything else I can help you with?",
                    flow_complete: true,
                };
            }
            default:
                return {
                    message: "Something went wrong. Let's start the assessment query again.",
                    next_step: 0,
                    awaiting_input: "query_type",
                };
        }
    }
    /** Fetch all assessments and display results */
    async fetchAssessments(phone, tin, data) {
        const result = await taxProMaxService.getAssessments(tin);
        if (!result.success || !result.data || result.data.length === 0) {
            return {
                message: `No assessments were found for TIN *${tin.slice(0, 3)}****${tin.slice(-2)}*.\n\n` +
                    "This could mean no assessments have been raised on your account yet.\n\n" +
                    "Would you like to:",
                buttons: [
                    { id: "done", title: "I'm Done" },
                ],
                next_step: 2,
                awaiting_input: "no_assessment_action",
            };
        }
        const assessments = result.data;
        data.assessments = assessments;
        const totalAssessed = assessments.reduce((s, a) => s + a.assessed_amount, 0);
        const totalPaid = assessments.reduce((s, a) => s + a.paid_amount, 0);
        const totalBalance = assessments.reduce((s, a) => s + a.balance, 0);
        const summary = assessments.map((a) => {
            const statusLabel = a.status === "paid" ? "Paid" :
                a.status === "partial" ? "Partially Paid" :
                    a.status === "unpaid" ? "UNPAID" :
                        a.status;
            return (`- *${a.tax_type}* (${a.period ?? `Year ${a.tax_year}`})\n` +
                `  Assessed: NGN ${a.assessed_amount.toLocaleString()} | Paid: NGN ${a.paid_amount.toLocaleString()} | Balance: NGN ${a.balance.toLocaleString()}\n` +
                `  Status: *${statusLabel}* | Due: ${a.due_date} | Basis: ${a.basis ?? "N/A"}`);
        }).join("\n\n");
        const buttons = this.getResultActionButtons(data);
        return {
            message: `*Assessment Summary for TIN ${tin.slice(0, 3)}****${tin.slice(-2)}*\n\n` +
                summary +
                `\n\n*Totals:*\n` +
                `Assessed: NGN ${totalAssessed.toLocaleString()}\n` +
                `Paid: NGN ${totalPaid.toLocaleString()}\n` +
                `Outstanding: NGN ${totalBalance.toLocaleString()}\n\n` +
                "What would you like to do?",
            buttons,
            next_step: 2,
            awaiting_input: "result_action",
        };
    }
    /** Fetch outstanding liabilities and display results */
    async fetchOutstandingLiabilities(phone, tin, data) {
        const result = await taxProMaxService.getOutstandingLiabilities(tin);
        if (!result.success || !result.data || result.data.length === 0) {
            return {
                message: `Great news! No outstanding liabilities were found for TIN *${tin.slice(0, 3)}****${tin.slice(-2)}*.\n\n` +
                    "Your account appears to be up to date.\n\n" +
                    "Is there anything else I can help you with?",
                buttons: [
                    { id: "view_assessment", title: "View All Assessments" },
                    { id: "done", title: "I'm Done" },
                ],
                next_step: 2,
                awaiting_input: "no_outstanding_action",
            };
        }
        const liabilities = result.data;
        data.assessments = liabilities;
        const totalOutstanding = liabilities.reduce((s, l) => s + l.balance, 0);
        const summary = liabilities.map((l) => {
            return (`- *${l.tax_type}* (${l.period ?? `Year ${l.tax_year}`})\n` +
                `  Outstanding: *NGN ${l.balance.toLocaleString()}*\n` +
                `  Due Date: ${l.due_date} | Ref: ${l.reference ?? "N/A"}`);
        }).join("\n\n");
        return {
            message: `*Outstanding Liabilities for TIN ${tin.slice(0, 3)}****${tin.slice(-2)}*\n\n` +
                summary +
                `\n\n*Total Outstanding: NGN ${totalOutstanding.toLocaleString()}*\n\n` +
                "What would you like to do?",
            buttons: [
                { id: "pay", title: "Make Payment" },
                { id: "dispute", title: "Dispute Assessment" },
                { id: "download", title: "Download Statement" },
                { id: "done", title: "I'm Done" },
            ],
            next_step: 2,
            awaiting_input: "outstanding_action",
        };
    }
    /** Build context-appropriate action buttons */
    getResultActionButtons(data) {
        const assessments = data.assessments;
        const hasOutstanding = assessments?.some((a) => a.balance > 0) ?? false;
        const queryType = data.query_type;
        const buttons = [];
        if (hasOutstanding) {
            buttons.push({ id: "pay", title: "Make Payment" });
        }
        if (queryType === "request_review" || hasOutstanding) {
            buttons.push({ id: "dispute", title: "Dispute Assessment" });
        }
        buttons.push({ id: "download", title: "Download Statement" });
        buttons.push({ id: "done", title: "I'm Done" });
        return buttons;
    }
}
export default new AssessmentQueryFlow();
