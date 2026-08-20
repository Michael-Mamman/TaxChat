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
        console.log('[assessmentQuery.flow::start] ENTER', { phone, entityKeys: entities ? Object.keys(entities) : [] });
        // If NLU already extracted a query type, advance
        if (entities?.query_type) {
            console.log('[assessmentQuery.flow::start] branch: entities.query_type provided');
            const queryType = entities.query_type.toLowerCase();
            const validTypes = ["view_assessment", "check_outstanding", "request_review"];
            if (validTypes.includes(queryType)) {
                console.log('[assessmentQuery.flow::start] branch: valid query_type - advancing to step 1');
                console.log('[assessmentQuery.flow::start] EXIT', { next_step: 1, awaiting_input: 'tin' });
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
            console.log('[assessmentQuery.flow::start] branch: entities.tin provided (valid 10-digit)');
            console.log('[assessmentQuery.flow::start] EXIT', { next_step: 0, awaiting_input: 'query_type' });
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
        console.log('[assessmentQuery.flow::start] branch: default path - asking for query type');
        console.log('[assessmentQuery.flow::start] EXIT', { next_step: 0, awaiting_input: 'query_type' });
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
        console.log('[assessmentQuery.flow::handleInput] ENTER', { phone, step, inputLen: input.length, inputPreview: input.slice(0, 3) + '***' });
        switch (step) {
            // ------------------------------------------------------------------
            // Step 0: Capture query type
            // ------------------------------------------------------------------
            case 0: {
                console.log('[assessmentQuery.flow::handleInput] branch: case 0 - capture query type');
                const queryType = input.trim().toLowerCase();
                const validTypes = ["view_assessment", "check_outstanding", "request_review"];
                if (!validTypes.includes(queryType)) {
                    console.log('[assessmentQuery.flow::handleInput] branch: invalid query type - re-prompt');
                    console.log('[assessmentQuery.flow::handleInput] EXIT', { next_step: 0, awaiting_input: 'query_type' });
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
                console.log('[assessmentQuery.flow::handleInput] branch: valid query type - advance to step 1', { queryType });
                console.log('[assessmentQuery.flow::handleInput] EXIT', { next_step: 1, awaiting_input: 'tin' });
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
                console.log('[assessmentQuery.flow::handleInput] branch: case 1 - collect TIN');
                const tin = input.trim().replace(/[\s-]/g, "");
                if (!/^\d{10}$/.test(tin)) {
                    console.log('[assessmentQuery.flow::handleInput] branch: invalid TIN format');
                    console.log('[assessmentQuery.flow::handleInput] EXIT', { next_step: 1, awaiting_input: 'tin' });
                    return {
                        message: "A TIN must be exactly *10 digits*. Please re-enter your TIN:",
                        next_step: 1,
                        awaiting_input: "tin",
                    };
                }
                data.tin = tin;
                const queryType = data.query_type;
                console.log('[assessmentQuery.flow::handleInput] branch: valid TIN, queryType=', queryType);
                // Determine which service call to make based on query type
                if (queryType === "check_outstanding") {
                    console.log('[assessmentQuery.flow::handleInput] branch: dispatch fetchOutstandingLiabilities');
                    console.log('[assessmentQuery.flow::handleInput] EXIT', { dispatched: 'fetchOutstandingLiabilities' });
                    return this.fetchOutstandingLiabilities(phone, tin, data);
                }
                // For view_assessment and request_review, fetch all assessments
                console.log('[assessmentQuery.flow::handleInput] branch: dispatch fetchAssessments');
                console.log('[assessmentQuery.flow::handleInput] EXIT', { dispatched: 'fetchAssessments' });
                return this.fetchAssessments(phone, tin, data);
            }
            // ------------------------------------------------------------------
            // Step 2: Display results and offer dispute / follow-up options
            // ------------------------------------------------------------------
            case 2: {
                console.log('[assessmentQuery.flow::handleInput] branch: case 2 - post-result action');
                const choice = input.trim().toLowerCase();
                if (choice === "done" || choice === "i'm done" || choice === "no" || choice === "exit") {
                    console.log('[assessmentQuery.flow::handleInput] branch: done/exit');
                    console.log('[assessmentQuery.flow::handleInput] EXIT', { flow_complete: true });
                    return {
                        message: "Thank you! If you need to check your assessments again, just say *check my assessment*.\n\n" +
                            "Type *menu* to see other services.",
                        flow_complete: true,
                    };
                }
                if (choice === "pay" || choice === "make payment" || choice === "pay_now") {
                    console.log('[assessmentQuery.flow::handleInput] branch: pay/make payment');
                    const assessments = data.assessments;
                    const outstanding = assessments?.filter((a) => a.balance > 0) ?? [];
                    const total = outstanding.reduce((sum, a) => sum + a.balance, 0);
                    console.log('[assessmentQuery.flow::handleInput] EXIT', { next_step: 2, awaiting_input: 'payment_action', total });
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
                    console.log('[assessmentQuery.flow::handleInput] branch: confirm_payment redirect');
                    console.log('[assessmentQuery.flow::handleInput] EXIT', { flow_complete: true });
                    return {
                        message: "Let's confirm that payment.\n\n" +
                            "_You can also say \"confirm payment\" at any time._",
                        flow_complete: true,
                        next_flow: "payment_confirmation",
                    };
                }
                if (choice === "dispute" || choice === "dispute assessment" || choice === "request_review") {
                    console.log('[assessmentQuery.flow::handleInput] branch: dispute selected');
                    const assessments = data.assessments;
                    if (assessments && assessments.length > 0) {
                        console.log('[assessmentQuery.flow::handleInput] branch: dispute with assessments list');
                        const listing = assessments.map((a, i) => `${i + 1}. *${a.tax_type}* (${a.period ?? `Year ${a.tax_year}`}) - NGN ${a.assessed_amount.toLocaleString()} (Ref: ${a.reference ?? "N/A"})`).join("\n");
                        data.dispute_options = assessments;
                        console.log('[assessmentQuery.flow::handleInput] EXIT', { next_step: 3, awaiting_input: 'dispute_selection' });
                        return {
                            message: "Which assessment would you like to dispute?\n\n" +
                                listing +
                                "\n\nPlease reply with the number of the assessment, or type *all* to dispute all:",
                            next_step: 3,
                            awaiting_input: "dispute_selection",
                        };
                    }
                    console.log('[assessmentQuery.flow::handleInput] branch: dispute with free-text description');
                    console.log('[assessmentQuery.flow::handleInput] EXIT', { next_step: 3, awaiting_input: 'dispute_description' });
                    return {
                        message: "Please describe the assessment you wish to dispute.\n\n" +
                            "Include the assessment reference, tax type, and reason for dispute:\n\n" +
                            "_Example: \"I disagree with VAT assessment NRS/ASS/2024/00456 - the amount is overstated\"_",
                        next_step: 3,
                        awaiting_input: "dispute_description",
                    };
                }
                if (choice === "download" || choice === "download statement") {
                    console.log('[assessmentQuery.flow::handleInput] branch: download statement');
                    console.log('[assessmentQuery.flow::handleInput] EXIT', { next_step: 2, awaiting_input: 'post_download_action' });
                    return {
                        message: "I've requested your assessment statement. Quote your TIN at your tax office to collect it.\n\n" +
                            "Is there anything else I can help you with?",
                        buttons: [
                            { id: "dispute", title: "Dispute Assessment" },
                            { id: "done", title: "I'm Done" },
                        ],
                        next_step: 2,
                        awaiting_input: "post_download_action",
                    };
                }
                console.log('[assessmentQuery.flow::handleInput] branch: case 2 default - re-prompt');
                console.log('[assessmentQuery.flow::handleInput] EXIT', { next_step: 2, awaiting_input: 'result_action' });
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
                console.log('[assessmentQuery.flow::handleInput] branch: case 3 - dispute ticket creation');
                const trimmed = input.trim();
                const tin = data.tin ?? "N/A";
                // Handle numeric selection from dispute options
                const disputeOptions = data.dispute_options;
                let disputeDescription;
                if (disputeOptions && disputeOptions.length > 0 && !data.dispute_description) {
                    console.log('[assessmentQuery.flow::handleInput] branch: dispute option selection');
                    if (trimmed.toLowerCase() === "all") {
                        console.log('[assessmentQuery.flow::handleInput] branch: dispute all');
                        disputeDescription = disputeOptions.map((a) => `${a.tax_type} (${a.period ?? `Year ${a.tax_year}`}) - Ref: ${a.reference ?? a.assessment_id} - NGN ${a.assessed_amount.toLocaleString()}`).join("\n");
                        data.disputed_assessments = disputeOptions;
                    }
                    else {
                        const selection = parseInt(trimmed, 10);
                        if (isNaN(selection) || selection < 1 || selection > disputeOptions.length) {
                            console.log('[assessmentQuery.flow::handleInput] branch: invalid dispute selection');
                            console.log('[assessmentQuery.flow::handleInput] EXIT', { next_step: 3, awaiting_input: 'dispute_selection' });
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
                        console.log('[assessmentQuery.flow::handleInput] branch: dispute single selection', { selection });
                    }
                    // Ask for reason
                    data.dispute_description = disputeDescription;
                    console.log('[assessmentQuery.flow::handleInput] EXIT', { next_step: 3, awaiting_input: 'dispute_reason' });
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
                    console.log('[assessmentQuery.flow::handleInput] branch: collecting dispute reason');
                    if (trimmed.length < 10) {
                        console.log('[assessmentQuery.flow::handleInput] branch: reason too short');
                        console.log('[assessmentQuery.flow::handleInput] EXIT', { next_step: 3, awaiting_input: 'dispute_reason' });
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
                    console.log('[assessmentQuery.flow::handleInput] branch: free-text dispute description');
                    // Free-text dispute description (no prior selection)
                    if (trimmed.length < 10) {
                        console.log('[assessmentQuery.flow::handleInput] branch: description too short');
                        console.log('[assessmentQuery.flow::handleInput] EXIT', { next_step: 3, awaiting_input: 'dispute_description' });
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
                    console.log('[assessmentQuery.flow::handleInput] branch: fallback reason capture');
                    disputeDescription = data.dispute_description;
                    if (!data.dispute_reason) {
                        data.dispute_reason = trimmed;
                    }
                }
                // Create the ITSM ticket
                console.log('[assessmentQuery.flow::handleInput] branch: creating ASMT-REV ITSM ticket');
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
                    console.log('[assessmentQuery.flow::handleInput] branch: ticket creation failed');
                    console.log('[assessmentQuery.flow::handleInput] EXIT', { flow_complete: true, error: 'ticket creation failed' });
                    return {
                        message: "I'm sorry, there was an issue submitting your dispute request.\n\n" +
                            "Please try again later or visit your nearest FIRS office.\n\n" +
                            "If the problem persists, type *help* to speak with an agent.",
                        flow_complete: true,
                    };
                }
                console.log('[assessmentQuery.flow::handleInput] branch: ticket created successfully', { reference: ticketResult.data.reference });
                console.log('[assessmentQuery.flow::handleInput] EXIT', { flow_complete: true });
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
                console.log('[assessmentQuery.flow::handleInput] branch: default case - unknown step');
                console.log('[assessmentQuery.flow::handleInput] EXIT', { next_step: 0, awaiting_input: 'query_type' });
                return {
                    message: "Something went wrong. Let's start the assessment query again.",
                    next_step: 0,
                    awaiting_input: "query_type",
                };
        }
    }
    /** Fetch all assessments and display results */
    async fetchAssessments(phone, tin, data) {
        console.log('[assessmentQuery.flow::fetchAssessments] ENTER', { phone, tinPreview: tin.slice(0, 3) + '***' });
        const result = await taxProMaxService.getAssessments(tin);
        if (!result.success || !result.data || result.data.length === 0) {
            console.log('[assessmentQuery.flow::fetchAssessments] branch: no assessments found');
            console.log('[assessmentQuery.flow::fetchAssessments] EXIT', { next_step: 2, awaiting_input: 'no_assessment_action' });
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
        console.log('[assessmentQuery.flow::fetchAssessments] branch: assessments found', { count: result.data.length });
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
        console.log('[assessmentQuery.flow::fetchAssessments] EXIT', { next_step: 2, awaiting_input: 'result_action', totalAssessed, totalBalance });
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
        console.log('[assessmentQuery.flow::fetchOutstandingLiabilities] ENTER', { phone, tinPreview: tin.slice(0, 3) + '***' });
        const result = await taxProMaxService.getOutstandingLiabilities(tin);
        if (!result.success || !result.data || result.data.length === 0) {
            console.log('[assessmentQuery.flow::fetchOutstandingLiabilities] branch: no outstanding liabilities');
            console.log('[assessmentQuery.flow::fetchOutstandingLiabilities] EXIT', { next_step: 2, awaiting_input: 'no_outstanding_action' });
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
        console.log('[assessmentQuery.flow::fetchOutstandingLiabilities] branch: liabilities found', { count: result.data.length });
        const liabilities = result.data;
        data.assessments = liabilities;
        const totalOutstanding = liabilities.reduce((s, l) => s + l.balance, 0);
        const summary = liabilities.map((l) => {
            return (`- *${l.tax_type}* (${l.period ?? `Year ${l.tax_year}`})\n` +
                `  Outstanding: *NGN ${l.balance.toLocaleString()}*\n` +
                `  Due Date: ${l.due_date} | Ref: ${l.reference ?? "N/A"}`);
        }).join("\n\n");
        console.log('[assessmentQuery.flow::fetchOutstandingLiabilities] EXIT', { next_step: 2, awaiting_input: 'outstanding_action', totalOutstanding });
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
        console.log('[assessmentQuery.flow::getResultActionButtons] ENTER');
        const assessments = data.assessments;
        const hasOutstanding = assessments?.some((a) => a.balance > 0) ?? false;
        const queryType = data.query_type;
        const buttons = [];
        if (hasOutstanding) {
            console.log('[assessmentQuery.flow::getResultActionButtons] branch: hasOutstanding - add pay button');
            buttons.push({ id: "pay", title: "Make Payment" });
        }
        if (queryType === "request_review" || hasOutstanding) {
            console.log('[assessmentQuery.flow::getResultActionButtons] branch: add dispute button');
            buttons.push({ id: "dispute", title: "Dispute Assessment" });
        }
        buttons.push({ id: "download", title: "Download Statement" });
        buttons.push({ id: "done", title: "I'm Done" });
        console.log('[assessmentQuery.flow::getResultActionButtons] EXIT', { buttonCount: buttons.length });
        return buttons;
    }
}
export default new AssessmentQueryFlow();
