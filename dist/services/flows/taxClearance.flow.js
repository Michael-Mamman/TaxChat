import taxPromaxService from "../integrations/taxpromax.service.js";
import itsmService from "../integrations/itsm.service.js";
/**
 * Tax Clearance Certificate (TCC) Flow (Tier 2 - Requires authentication)
 *
 * Checks taxpayer compliance status and generates TCC if compliant,
 * otherwise shows gaps and offers resolution pathways.
 *
 * Steps:
 *   0 - Check compliance status using TIN
 *   1 - If compliant: generate TCC; if not: show compliance gaps
 *   2 - Offer resolution pathways for non-compliant taxpayers
 */
class TaxClearanceFlow {
    async start(phone, entities) {
        // If TIN was already extracted or available from session
        if (entities?.tin) {
            return this.checkCompliance(phone, entities.tin);
        }
        return {
            message: "I can help you with your Tax Clearance Certificate (TCC).\n\n" +
                "A TCC confirms you are up-to-date with your tax obligations. " +
                "It is typically required for government contracts, bank loans, and business registrations.\n\n" +
                "Please provide your *TIN* to check your compliance status:",
            next_step: 0,
            awaiting_input: "tin",
            requires_auth_tier: 2,
        };
    }
    async handleInput(phone, input, step, data) {
        switch (step) {
            // ------------------------------------------------------------------
            // Step 0: Collect TIN and check compliance
            // ------------------------------------------------------------------
            case 0: {
                const tin = input.trim().replace(/[\s-]/g, "");
                if (!/^\d{10}$/.test(tin) && !/^NEW-\d+$/.test(tin)) {
                    return {
                        message: "A TIN is a *10-digit number*. Please re-enter your TIN:\n\n" +
                            "_You can find your TIN on previous tax documents or by using our TIN Retrieval service._",
                        next_step: 0,
                        awaiting_input: "tin",
                    };
                }
                data.tin = tin;
                return this.checkCompliance(phone, tin);
            }
            // ------------------------------------------------------------------
            // Step 1: Handle compliant / non-compliant result
            // ------------------------------------------------------------------
            case 1: {
                const choice = input.trim().toLowerCase();
                // Compliant path -- user chooses delivery
                if (data.is_compliant) {
                    if (choice === "download" || choice === "download tcc") {
                        return {
                            message: "Your Tax Clearance Certificate is being generated.\n\n" +
                                "You will receive it as a PDF document in this chat shortly.\n\n" +
                                `*TCC Reference:* TCC-${Date.now().toString().slice(-8)}\n` +
                                `*Valid Until:* 31st December ${new Date().getFullYear()}\n\n` +
                                "Is there anything else I can help you with?",
                            flow_complete: true,
                        };
                    }
                    if (choice === "email" || choice === "send via email") {
                        return {
                            message: "Your Tax Clearance Certificate will be sent to your registered email.\n\n" +
                                `*TCC Reference:* TCC-${Date.now().toString().slice(-8)}\n` +
                                `*Valid Until:* 31st December ${new Date().getFullYear()}\n\n` +
                                "Please check your inbox within the next few minutes.\n\n" +
                                "Is there anything else I can help you with?",
                            flow_complete: true,
                        };
                    }
                    return {
                        message: "Please select how you'd like to receive your TCC:",
                        buttons: [
                            { id: "download", title: "Download TCC" },
                            { id: "email", title: "Send via Email" },
                        ],
                        next_step: 1,
                        awaiting_input: "tcc_delivery",
                    };
                }
                // Non-compliant path -- user chooses resolution
                if (choice === "pay_now" || choice === "pay outstanding") {
                    const liabilities = data.outstanding_liabilities;
                    const total = liabilities.reduce((sum, l) => sum + l.balance, 0);
                    return {
                        message: `Your total outstanding balance is *NGN ${total.toLocaleString()}*.\n\n` +
                            "To make a payment, you can:\n" +
                            "1. Pay via Remita using reference numbers shown below\n" +
                            "2. Visit any FIRS office with your TIN\n\n" +
                            liabilities
                                .map((l) => `- *${l.tax_type}*: NGN ${l.balance.toLocaleString()} (Ref: ${l.reference ?? "N/A"})`)
                                .join("\n") +
                            "\n\nOnce payment is confirmed, you can request your TCC again.\n\n" +
                            "Would you like me to help confirm a payment?",
                        buttons: [
                            { id: "confirm_payment", title: "Confirm Payment" },
                            { id: "done", title: "I'll pay later" },
                        ],
                        next_step: 2,
                        awaiting_input: "payment_action",
                    };
                }
                if (choice === "file_returns" || choice === "file pending returns") {
                    const overdue = data.overdue_filings;
                    return {
                        message: "Here are your outstanding filing obligations:\n\n" +
                            overdue
                                .map((f) => `- *${f.tax_type}* for period ${f.period ?? "N/A"}`)
                                .join("\n") +
                            "\n\nYou can file your returns on *TaxProMax*:\n" +
                            "https://taxpromax.firs.gov.ng\n\n" +
                            "Need help filing? I can guide you through the process.",
                        buttons: [
                            { id: "filing_help", title: "Help me file" },
                            { id: "done", title: "I'll file myself" },
                        ],
                        next_step: 2,
                        awaiting_input: "filing_action",
                    };
                }
                if (choice === "waiver" || choice === "request penalty waiver") {
                    // Create ITSM ticket for penalty waiver
                    const ticketResult = await itsmService.createTicket({
                        type: "PENALTY-WAIVER",
                        subject: `Penalty waiver request - TIN ${data.tin}`,
                        description: `Taxpayer requesting penalty waiver to obtain TCC.\n` +
                            `TIN: ${data.tin}\nPhone: ${phone}`,
                        taxpayer_tin: data.tin,
                        phone,
                        priority: "medium",
                    });
                    return {
                        message: `A penalty waiver request has been submitted.\n\n` +
                            `*Ticket Reference:* ${ticketResult.data?.reference ?? "N/A"}\n` +
                            `*SLA:* You will receive a response within 48 hours.\n\n` +
                            "A tax officer will review your account and contact you.\n\n" +
                            "Is there anything else I can help you with?",
                        flow_complete: true,
                    };
                }
                if (choice === "escalate" || choice === "speak to an officer") {
                    return {
                        message: "I'll connect you with a tax officer who can help resolve your compliance issues.\n\n" +
                            "Please hold while I arrange the escalation...",
                        escalate: true,
                        escalation_reason: `TCC request - non-compliant taxpayer TIN ${data.tin}`,
                        flow_complete: true,
                    };
                }
                // Re-display resolution options
                return this.buildResolutionMenu(data);
            }
            // ------------------------------------------------------------------
            // Step 2: Secondary resolution actions
            // ------------------------------------------------------------------
            case 2: {
                const choice = input.trim().toLowerCase();
                if (choice === "confirm_payment" || choice === "confirm payment") {
                    return {
                        message: "I'll redirect you to Payment Confirmation. One moment...\n\n" +
                            "_You can also say \"confirm payment\" at any time._",
                        flow_complete: true,
                    };
                }
                if (choice === "filing_help" || choice === "help me file") {
                    return {
                        message: "I'll redirect you to our Filing Support service. One moment...\n\n" +
                            "_You can also say \"help me file\" at any time._",
                        flow_complete: true,
                    };
                }
                if (choice === "done" || choice === "i'll pay later" || choice === "i'll file myself") {
                    return {
                        message: "No problem. Remember, you can request your TCC once all obligations are settled.\n\n" +
                            "Type *menu* to see other services, or ask me anything.",
                        flow_complete: true,
                    };
                }
                return {
                    message: "Please select an option or type *menu* to return to the main menu:",
                    buttons: [
                        { id: "confirm_payment", title: "Confirm Payment" },
                        { id: "filing_help", title: "Help me file" },
                        { id: "done", title: "Done" },
                    ],
                    next_step: 2,
                    awaiting_input: "secondary_action",
                };
            }
            default:
                return {
                    message: "Something went wrong. Let's start the TCC process again.",
                    next_step: 0,
                    awaiting_input: "tin",
                };
        }
    }
    /** Check compliance and return the appropriate step result */
    async checkCompliance(phone, tin) {
        const compliance = await taxPromaxService.getComplianceStatus(tin);
        if (!compliance.success || !compliance.data) {
            return {
                message: "I was unable to retrieve your compliance status at this time.\n\n" +
                    "This may be due to a temporary system issue. Please try again later " +
                    "or visit your nearest FIRS office.\n\n" +
                    "Type *menu* to see other services.",
                flow_complete: true,
            };
        }
        const status = compliance.data;
        if (status.is_compliant) {
            return {
                message: `Great news! Your tax account (TIN: ${tin.slice(0, 3)}****${tin.slice(-2)}) is *fully compliant*.\n\n` +
                    "You are eligible for a Tax Clearance Certificate.\n\n" +
                    "How would you like to receive your TCC?",
                buttons: [
                    { id: "download", title: "Download TCC" },
                    { id: "email", title: "Send via Email" },
                ],
                next_step: 1,
                awaiting_input: "tcc_delivery",
            };
        }
        // Non-compliant: build gap summary
        const overdueFilings = status.filings.filter((f) => f.status === "overdue");
        const outstandingAssessments = status.outstanding_assessments.filter((a) => a.balance > 0);
        const outstandingPenalties = status.penalties.filter((p) => p.status === "outstanding");
        const gaps = [];
        if (overdueFilings.length > 0) {
            gaps.push(`*Overdue Filings (${overdueFilings.length}):*\n` +
                overdueFilings
                    .map((f) => `  - ${f.tax_type} for ${f.period ?? `Year ${f.tax_year}`}`)
                    .join("\n"));
        }
        if (outstandingAssessments.length > 0) {
            const totalOwed = outstandingAssessments.reduce((s, a) => s + a.balance, 0);
            gaps.push(`*Outstanding Assessments:*\n` +
                outstandingAssessments
                    .map((a) => `  - ${a.tax_type} (${a.period ?? `Year ${a.tax_year}`}): NGN ${a.balance.toLocaleString()}`)
                    .join("\n") +
                `\n  Total: *NGN ${totalOwed.toLocaleString()}*`);
        }
        if (outstandingPenalties.length > 0) {
            const totalPenalties = outstandingPenalties.reduce((s, p) => s + p.amount, 0);
            gaps.push(`*Penalties & Interest:*\n` +
                outstandingPenalties
                    .map((p) => `  - ${p.reason}: NGN ${p.amount.toLocaleString()}`)
                    .join("\n") +
                `\n  Total: *NGN ${totalPenalties.toLocaleString()}*`);
        }
        // Store data for subsequent steps
        const resultData = {
            tin,
            is_compliant: false,
            overdue_filings: overdueFilings,
            outstanding_liabilities: outstandingAssessments,
            outstanding_penalties: outstandingPenalties,
        };
        return {
            message: `Your tax account (TIN: ${tin.slice(0, 3)}****${tin.slice(-2)}) has *compliance gaps* that must be resolved before a TCC can be issued.\n\n` +
                gaps.join("\n\n") +
                "\n\nHow would you like to proceed?",
            buttons: this.getResolutionButtons(overdueFilings.length, outstandingAssessments.length, outstandingPenalties.length),
            next_step: 1,
            awaiting_input: "resolution_choice",
        };
    }
    /** Build resolution option buttons based on what gaps exist */
    getResolutionButtons(overdueCount, assessmentCount, penaltyCount) {
        const buttons = [];
        if (assessmentCount > 0)
            buttons.push({ id: "pay_now", title: "Pay Outstanding" });
        if (overdueCount > 0)
            buttons.push({ id: "file_returns", title: "File Pending Returns" });
        if (penaltyCount > 0)
            buttons.push({ id: "waiver", title: "Request Penalty Waiver" });
        buttons.push({ id: "escalate", title: "Speak to an Officer" });
        return buttons;
    }
    /** Re-display resolution menu */
    buildResolutionMenu(data) {
        const overdue = data.overdue_filings?.length ?? 0;
        const assessments = data.outstanding_liabilities?.length ?? 0;
        const penalties = data.outstanding_penalties?.length ?? 0;
        return {
            message: "Please choose one of the resolution options below:",
            buttons: this.getResolutionButtons(overdue, assessments, penalties),
            next_step: 1,
            awaiting_input: "resolution_choice",
        };
    }
}
export default new TaxClearanceFlow();
