import taxProMaxService from "../integrations/taxpromax.service.js";
import itsmService from "../integrations/itsm.service.js";
/**
 * Filing Support Flow (Tier 1 - Self-service)
 *
 * Helps taxpayers with filing questions and CIT/VAT/PAYE/WHT return guidance.
 *
 * Steps:
 *   0 - Ask tax type (CIT/VAT/PAYE/WHT)
 *   1 - Lookup filing status via taxpromax
 *   2 - Display status and offer filing guidance
 *   3 - Create ITSM ticket if needed (FIL-SUP)
 */
class FilingSupportFlow {
    async start(phone, entities) {
        console.log('[filingSupport.flow::start] ENTER', { phone, entityKeys: entities ? Object.keys(entities) : [] });
        // If the NLU already identified a tax type, skip to lookup
        if (entities?.tax_type) {
            console.log('[filingSupport.flow::start] branch: entities.tax_type provided');
            const taxType = entities.tax_type.toUpperCase();
            if (["CIT", "VAT", "PAYE", "WHT"].includes(taxType)) {
                console.log('[filingSupport.flow::start] branch: valid tax type - advance to step 1', { taxType });
                console.log('[filingSupport.flow::start] EXIT', { next_step: 1, awaiting_input: 'lookup_in_progress' });
                return {
                    message: `I'll look up your *${taxType}* filing status now. One moment...`,
                    next_step: 1,
                    awaiting_input: "lookup_in_progress",
                };
            }
        }
        console.log('[filingSupport.flow::start] branch: default path - ask tax type');
        console.log('[filingSupport.flow::start] EXIT', { next_step: 0, awaiting_input: 'tax_type' });
        return {
            message: "I can help you with your tax filing obligations.\n\n" +
                "Which tax type do you need help with?",
            menu_options: [
                {
                    id: "CIT",
                    title: "CIT",
                    description: "Company Income Tax - Annual filing",
                },
                {
                    id: "VAT",
                    title: "VAT",
                    description: "Value Added Tax - Monthly filing",
                },
                {
                    id: "PAYE",
                    title: "PAYE",
                    description: "Pay-As-You-Earn - Monthly filing",
                },
                {
                    id: "WHT",
                    title: "WHT",
                    description: "Withholding Tax - Per transaction",
                },
            ],
            next_step: 0,
            awaiting_input: "tax_type",
        };
    }
    async handleInput(phone, input, step, data) {
        console.log('[filingSupport.flow::handleInput] ENTER', { phone, step, inputLen: input.length, inputPreview: input.slice(0, 3) + '***' });
        switch (step) {
            // ------------------------------------------------------------------
            // Step 0: Capture the tax type
            // ------------------------------------------------------------------
            case 0: {
                console.log('[filingSupport.flow::handleInput] branch: case 0 - capture tax type');
                const taxType = input.trim().toUpperCase();
                const validTypes = ["CIT", "VAT", "PAYE", "WHT"];
                if (!validTypes.includes(taxType)) {
                    console.log('[filingSupport.flow::handleInput] branch: invalid tax type');
                    console.log('[filingSupport.flow::handleInput] EXIT', { next_step: 0, awaiting_input: 'tax_type' });
                    return {
                        message: "Please select a valid tax type from the options below:",
                        menu_options: [
                            { id: "CIT", title: "CIT", description: "Company Income Tax - Annual filing" },
                            { id: "VAT", title: "VAT", description: "Value Added Tax - Monthly filing" },
                            { id: "PAYE", title: "PAYE", description: "Pay-As-You-Earn - Monthly filing" },
                            { id: "WHT", title: "WHT", description: "Withholding Tax - Per transaction" },
                        ],
                        next_step: 0,
                        awaiting_input: "tax_type",
                    };
                }
                data.tax_type = taxType;
                console.log('[filingSupport.flow::handleInput] branch: valid tax type', { taxType });
                // Ask for TIN to look up filing status
                console.log('[filingSupport.flow::handleInput] EXIT', { next_step: 1, awaiting_input: 'tin' });
                return {
                    message: `You selected *${taxType}*.\n\n` +
                        "Please provide your *TIN (Taxpayer Identification Number)* so I can check your filing status:\n\n" +
                        "_Your TIN is the 10-digit number on your tax documents._",
                    next_step: 1,
                    awaiting_input: "tin",
                };
            }
            // ------------------------------------------------------------------
            // Step 1: Collect TIN and lookup filing status via TaxProMax
            // ------------------------------------------------------------------
            case 1: {
                console.log('[filingSupport.flow::handleInput] branch: case 1 - TIN lookup');
                const tin = input.trim().replace(/[\s-]/g, "");
                if (!/^\d{10}$/.test(tin)) {
                    console.log('[filingSupport.flow::handleInput] branch: invalid TIN format');
                    console.log('[filingSupport.flow::handleInput] EXIT', { next_step: 1, awaiting_input: 'tin' });
                    return {
                        message: "A TIN must be exactly *10 digits*. Please re-enter your TIN:\n\n" +
                            "_You can find your TIN on previous tax documents or receipts._",
                        next_step: 1,
                        awaiting_input: "tin",
                    };
                }
                data.tin = tin;
                const taxType = data.tax_type;
                console.log('[filingSupport.flow::handleInput] branch: fetching filing status', { taxType, tinPreview: tin.slice(0, 3) + '***' });
                // Fetch filing status from TaxProMax
                const result = await taxProMaxService.getFilingStatus(tin);
                if (!result.success || !result.data) {
                    console.log('[filingSupport.flow::handleInput] branch: filing status lookup failed');
                    console.log('[filingSupport.flow::handleInput] EXIT', { next_step: 2, awaiting_input: 'error_action' });
                    return {
                        message: "I was unable to retrieve your filing status at this time.\n\n" +
                            "This may be due to a temporary system issue. Please try again later " +
                            "or visit your nearest FIRS office.\n\n" +
                            "Would you like me to raise a support ticket instead?",
                        buttons: [
                            { id: "raise_ticket", title: "Raise Support Ticket" },
                            { id: "done", title: "No, I'll try later" },
                        ],
                        next_step: 2,
                        awaiting_input: "error_action",
                    };
                }
                // Filter filings for the selected tax type
                const filings = result.data.filter((f) => f.tax_type.toUpperCase() === taxType);
                data.filings = filings;
                if (filings.length === 0) {
                    console.log('[filingSupport.flow::handleInput] branch: no filings found for tax type');
                    console.log('[filingSupport.flow::handleInput] EXIT', { next_step: 2, awaiting_input: 'no_records_action' });
                    return {
                        message: `No *${taxType}* filing records were found for TIN *${tin.slice(0, 3)}****${tin.slice(-2)}*.\n\n` +
                            "This could mean:\n" +
                            "- You have not yet filed any returns for this tax type\n" +
                            "- Your TIN may not be registered for this obligation\n\n" +
                            "Would you like guidance on how to file, or shall I raise a support ticket?",
                        buttons: [
                            { id: "guidance", title: "Filing Guidance" },
                            { id: "raise_ticket", title: "Raise Support Ticket" },
                            { id: "done", title: "I'm Done" },
                        ],
                        next_step: 2,
                        awaiting_input: "no_records_action",
                    };
                }
                console.log('[filingSupport.flow::handleInput] branch: filings retrieved', { count: filings.length });
                // Build a filing status summary
                const summary = filings.map((f) => {
                    const statusEmoji = f.status === "filed" ? "Filed" :
                        f.status === "pending" ? "Pending" :
                            "OVERDUE";
                    const amountStr = f.amount_due && f.amount_due > 0
                        ? ` | Amount Due: NGN ${f.amount_due.toLocaleString()}`
                        : "";
                    return `- *${f.tax_type}* (${f.period ?? `Year ${f.tax_year}`}): *${statusEmoji}*${amountStr}`;
                }).join("\n");
                const overdueCount = filings.filter((f) => f.status === "overdue").length;
                const pendingCount = filings.filter((f) => f.status === "pending").length;
                let followUp;
                if (overdueCount > 0) {
                    console.log('[filingSupport.flow::handleInput] branch: has overdue filings', { overdueCount });
                    followUp =
                        `\n\nYou have *${overdueCount} overdue filing(s)* that require immediate attention.\n\n` +
                            "What would you like to do?";
                }
                else if (pendingCount > 0) {
                    console.log('[filingSupport.flow::handleInput] branch: has pending filings', { pendingCount });
                    followUp =
                        `\n\nYou have *${pendingCount} pending filing(s)* approaching their deadline.\n\n` +
                            "What would you like to do?";
                }
                else {
                    console.log('[filingSupport.flow::handleInput] branch: all up to date');
                    followUp =
                        "\n\nAll your filings are up to date! Is there anything else I can help with?";
                }
                const buttons = overdueCount > 0 || pendingCount > 0
                    ? [
                        { id: "guidance", title: "Filing Guidance" },
                        { id: "raise_ticket", title: "Raise Support Ticket" },
                        { id: "done", title: "I'm Done" },
                    ]
                    : [
                        { id: "guidance", title: "Filing Guidance" },
                        { id: "done", title: "I'm Done" },
                    ];
                console.log('[filingSupport.flow::handleInput] EXIT', { next_step: 2, awaiting_input: 'status_action' });
                return {
                    message: `*${taxType} Filing Status for TIN ${tin.slice(0, 3)}****${tin.slice(-2)}*\n\n` +
                        summary +
                        followUp,
                    buttons,
                    next_step: 2,
                    awaiting_input: "status_action",
                };
            }
            // ------------------------------------------------------------------
            // Step 2: Display guidance or offer ITSM ticket
            // ------------------------------------------------------------------
            case 2: {
                console.log('[filingSupport.flow::handleInput] branch: case 2 - status action');
                const choice = input.trim().toLowerCase();
                const taxType = data.tax_type;
                if (choice === "done" || choice === "i'm done" || choice === "no" || choice === "no, i'll try later") {
                    console.log('[filingSupport.flow::handleInput] branch: done');
                    console.log('[filingSupport.flow::handleInput] EXIT', { flow_complete: true });
                    return {
                        message: "Thank you! If you need filing assistance in the future, just say *filing support* or *help me file*.\n\n" +
                            "Type *menu* to see other services.",
                        flow_complete: true,
                    };
                }
                if (choice === "guidance" || choice === "filing guidance") {
                    console.log('[filingSupport.flow::handleInput] branch: guidance requested');
                    const guidance = this.getFilingGuidance(taxType);
                    console.log('[filingSupport.flow::handleInput] EXIT', { next_step: 2, awaiting_input: 'post_guidance_action' });
                    return {
                        message: guidance +
                            "\n\nWould you like me to raise a support ticket for further assistance?",
                        buttons: [
                            { id: "raise_ticket", title: "Yes, Raise a Ticket" },
                            { id: "done", title: "No, I'm Good" },
                        ],
                        next_step: 2,
                        awaiting_input: "post_guidance_action",
                    };
                }
                if (choice === "raise_ticket" || choice === "raise support ticket" || choice === "yes, raise a ticket" || choice === "yes") {
                    console.log('[filingSupport.flow::handleInput] branch: raise_ticket selected');
                    console.log('[filingSupport.flow::handleInput] EXIT', { next_step: 3, awaiting_input: 'ticket_description' });
                    return {
                        message: "I'll create a support ticket for you.\n\n" +
                            "Please briefly describe the issue you're facing with your filing:\n\n" +
                            "_Example: \"I cannot submit my VAT return for March 2025 on TaxProMax\"_",
                        next_step: 3,
                        awaiting_input: "ticket_description",
                    };
                }
                console.log('[filingSupport.flow::handleInput] branch: case 2 default - re-prompt');
                console.log('[filingSupport.flow::handleInput] EXIT', { next_step: 2, awaiting_input: 'status_action' });
                return {
                    message: "Please select one of the options below:",
                    buttons: [
                        { id: "guidance", title: "Filing Guidance" },
                        { id: "raise_ticket", title: "Raise Support Ticket" },
                        { id: "done", title: "I'm Done" },
                    ],
                    next_step: 2,
                    awaiting_input: "status_action",
                };
            }
            // ------------------------------------------------------------------
            // Step 3: Create ITSM ticket (FIL-SUP)
            // ------------------------------------------------------------------
            case 3: {
                console.log('[filingSupport.flow::handleInput] branch: case 3 - ticket creation');
                const description = input.trim();
                if (description.length < 10) {
                    console.log('[filingSupport.flow::handleInput] branch: description too short');
                    console.log('[filingSupport.flow::handleInput] EXIT', { next_step: 3, awaiting_input: 'ticket_description' });
                    return {
                        message: "Please provide a bit more detail so we can assist you effectively.\n\n" +
                            "Describe the filing issue you need help with:",
                        next_step: 3,
                        awaiting_input: "ticket_description",
                    };
                }
                const taxType = data.tax_type;
                const tin = data.tin ?? "N/A";
                console.log('[filingSupport.flow::handleInput] branch: creating FIL-SUP ticket');
                const ticketResult = await itsmService.createTicket({
                    type: "FIL-SUP",
                    subject: `Filing Support - ${taxType} - TIN ${tin}`,
                    description: `Tax Type: ${taxType}\n` +
                        `TIN: ${tin}\n` +
                        `Phone: ${phone}\n\n` +
                        `Issue Description:\n${description}`,
                    taxpayer_tin: tin,
                    phone,
                    priority: "medium",
                });
                if (!ticketResult.success) {
                    console.log('[filingSupport.flow::handleInput] branch: ticket creation failed');
                    console.log('[filingSupport.flow::handleInput] EXIT', { flow_complete: true, error: 'ticket creation failed' });
                    return {
                        message: "I'm sorry, there was an issue creating your support ticket.\n\n" +
                            "Please try again later or visit your nearest FIRS office for assistance.\n\n" +
                            "If the problem persists, type *help* to speak with an agent.",
                        flow_complete: true,
                    };
                }
                console.log('[filingSupport.flow::handleInput] branch: ticket created', { reference: ticketResult.data.reference });
                console.log('[filingSupport.flow::handleInput] EXIT', { flow_complete: true });
                return {
                    message: `Your filing support ticket has been created successfully!\n\n` +
                        `*Ticket Reference:* ${ticketResult.data.reference}\n` +
                        `*Tax Type:* ${taxType}\n` +
                        `*SLA:* You will receive a response within 48 hours.\n\n` +
                        `A tax officer will review your request and contact you.\n` +
                        `You can check your ticket status anytime by saying:\n` +
                        `"_Check status of ${ticketResult.data.reference}_"\n\n` +
                        "Is there anything else I can help you with?",
                    flow_complete: true,
                };
            }
            default:
                console.log('[filingSupport.flow::handleInput] branch: default case - unknown step');
                console.log('[filingSupport.flow::handleInput] EXIT', { next_step: 0, awaiting_input: 'tax_type' });
                return {
                    message: "Something went wrong. Let's start the filing support again.",
                    next_step: 0,
                    awaiting_input: "tax_type",
                };
        }
    }
    /** Returns step-by-step filing guidance for a tax type */
    getFilingGuidance(taxType) {
        console.log('[filingSupport.flow::getFilingGuidance] ENTER', { taxType });
        const deadlines = {
            CIT: "within 6 months after the end of your accounting year",
            VAT: "by the 21st of the following month",
            PAYE: "by the 10th of the following month",
            WHT: "within 21 days of deduction",
        };
        const guidance = {
            CIT: "*CIT Filing Guide*\n\n" +
                "1. Log in to TaxProMax: https://taxpromax.firs.gov.ng\n" +
                "2. Navigate to *Returns* > *Company Income Tax*\n" +
                "3. Select the relevant assessment year\n" +
                "4. Upload your audited financial statements\n" +
                "5. Complete the self-assessment computation\n" +
                "6. Submit the return and generate an RRR for payment\n\n" +
                `*Deadline:* CIT returns must be filed ${deadlines["CIT"]}.`,
            VAT: "*VAT Filing Guide*\n\n" +
                "1. Log in to TaxProMax: https://taxpromax.firs.gov.ng\n" +
                "2. Navigate to *Returns* > *VAT*\n" +
                "3. Select the filing month\n" +
                "4. Enter your output VAT (7.5% of sales) and input VAT (7.5% of purchases)\n" +
                "5. The system will compute your net VAT payable\n" +
                "6. Submit and generate an RRR for payment\n\n" +
                `*Deadline:* VAT returns must be filed ${deadlines["VAT"]}.`,
            PAYE: "*PAYE Filing Guide*\n\n" +
                "1. Log in to TaxProMax: https://taxpromax.firs.gov.ng\n" +
                "2. Navigate to *Returns* > *PAYE*\n" +
                "3. Select the filing month\n" +
                "4. Upload your employee schedule (names, TINs, emoluments, tax deducted)\n" +
                "5. The system will validate and compute total PAYE due\n" +
                "6. Submit and generate an RRR for remittance\n\n" +
                `*Deadline:* PAYE must be remitted ${deadlines["PAYE"]}.`,
            WHT: "*WHT Filing Guide*\n\n" +
                "1. Log in to TaxProMax: https://taxpromax.firs.gov.ng\n" +
                "2. Navigate to *Returns* > *WHT*\n" +
                "3. Enter the details of the transaction (payee, amount, WHT rate)\n" +
                "4. The system will compute the WHT amount\n" +
                "5. Submit and generate an RRR for remittance\n" +
                "6. Issue a WHT credit note to the payee after remittance\n\n" +
                `*Deadline:* WHT must be remitted ${deadlines["WHT"]}.`,
        };
        const result = guidance[taxType] ?? "Please visit https://taxpromax.firs.gov.ng for filing instructions.";
        console.log('[filingSupport.flow::getFilingGuidance] EXIT', { hasGuidance: !!guidance[taxType] });
        return result;
    }
}
export default new FilingSupportFlow();
