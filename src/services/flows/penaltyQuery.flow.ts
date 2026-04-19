import type { FlowStepResult } from "../../types/conversation.types.js";
import taxProMaxService from "../integrations/taxpromax.service.js";
import itsmService from "../integrations/itsm.service.js";

/**
 * Penalty Query Flow (Tier 1 - Self-service)
 *
 * Helps taxpayers query penalties and request waivers.
 *
 * Steps:
 *   0 - Ask TIN or display known penalties
 *   1 - Show penalty details from taxpromax
 *   2 - Offer waiver request option
 *   3 - Create PEN-WAIVER ITSM ticket
 */
class PenaltyQueryFlow {
  async start(
    phone: string,
    entities?: Record<string, string>,
  ): Promise<FlowStepResult> {
    console.log('[penaltyQuery.flow::start] ENTER', { phone, entityKeys: entities ? Object.keys(entities) : [] });
    // If NLU already provided a TIN, skip to penalty lookup
    if (entities?.tin && /^\d{10}$/.test(entities.tin)) {
      console.log('[penaltyQuery.flow::start] branch: entities.tin provided - skip to lookup');
      console.log('[penaltyQuery.flow::start] EXIT', { next_step: 1, awaiting_input: 'lookup_in_progress' });
      return {
        message:
          `I'll look up penalties for TIN *${entities.tin.slice(0, 3)}****${entities.tin.slice(-2)}*. One moment...`,
        next_step: 1,
        awaiting_input: "lookup_in_progress",
      };
    }

    console.log('[penaltyQuery.flow::start] branch: default - ask for TIN');
    console.log('[penaltyQuery.flow::start] EXIT', { next_step: 0, awaiting_input: 'tin' });
    return {
      message:
        "I can help you review penalties on your tax account.\n\n" +
        "Please provide your *TIN (Taxpayer Identification Number)* to get started:\n\n" +
        "_Your TIN is the 10-digit number on your tax documents._",
      next_step: 0,
      awaiting_input: "tin",
    };
  }

  async handleInput(
    phone: string,
    input: string,
    step: number,
    data: Record<string, unknown>,
  ): Promise<FlowStepResult> {
    console.log('[penaltyQuery.flow::handleInput] ENTER', { phone, step, inputLen: input.length });
    switch (step) {
      // ------------------------------------------------------------------
      // Step 0: Collect TIN
      // ------------------------------------------------------------------
      case 0: {
        console.log('[penaltyQuery.flow::handleInput] branch: case 0 - collect TIN');
        const tin = input.trim().replace(/[\s-]/g, "");

        if (!/^\d{10}$/.test(tin)) {
          console.log('[penaltyQuery.flow::handleInput] branch: invalid TIN');
          console.log('[penaltyQuery.flow::handleInput] EXIT', { next_step: 0, awaiting_input: 'tin' });
          return {
            message:
              "A TIN must be exactly *10 digits*. Please re-enter your TIN:\n\n" +
              "_You can find your TIN on previous tax documents or receipts._",
            next_step: 0,
            awaiting_input: "tin",
          };
        }

        data.tin = tin;
        console.log('[penaltyQuery.flow::handleInput] branch: valid TIN - fetching penalties');
        console.log('[penaltyQuery.flow::handleInput] EXIT', { dispatched: 'fetchPenalties' });
        return this.fetchPenalties(phone, tin, data);
      }

      // ------------------------------------------------------------------
      // Step 1: Show penalty details and allow selection
      // ------------------------------------------------------------------
      case 1: {
        console.log('[penaltyQuery.flow::handleInput] branch: case 1 - penalty selection');
        const trimmed = input.trim().toLowerCase();
        const penalties = data.penalties as Array<{
          penalty_id: string;
          type: string;
          amount: number;
          reason: string;
          statutory_basis?: string;
          original_due_date?: string;
          status: string;
        }>;

        if (trimmed === "done" || trimmed === "i'm done" || trimmed === "exit") {
          console.log('[penaltyQuery.flow::handleInput] branch: done');
          console.log('[penaltyQuery.flow::handleInput] EXIT', { flow_complete: true });
          return {
            message:
              "Thank you! If you need to review penalties again, just say *penalty query*.\n\n" +
              "Type *menu* to see other services.",
            flow_complete: true,
          };
        }

        if (trimmed === "pay_all" || trimmed === "pay all penalties") {
          console.log('[penaltyQuery.flow::handleInput] branch: pay_all');
          const total = penalties.reduce((s, p) => s + p.amount, 0);
          console.log('[penaltyQuery.flow::handleInput] EXIT', { flow_complete: true, total });
          return {
            message:
              `To pay all penalties totalling *NGN ${total.toLocaleString()}*:\n\n` +
              "1. Visit *remita.net* or your bank\n" +
              "2. Use your TIN as the payment reference\n" +
              "3. Select 'Penalty Payment' as the payment type\n\n" +
              "After payment, you can confirm it by saying *confirm payment*.\n\n" +
              "Is there anything else I can help you with?",
            flow_complete: true,
          };
        }

        if (trimmed === "waiver_all" || trimmed === "request waiver for all") {
          console.log('[penaltyQuery.flow::handleInput] branch: waiver_all');
          data.waiver_scope = "all";
          data.selected_penalty = null;
          const total = penalties.reduce((s, p) => s + p.amount, 0);
          console.log('[penaltyQuery.flow::handleInput] EXIT', { next_step: 2, awaiting_input: 'waiver_ground', total });
          return {
            message:
              `You'd like to request a waiver for *all penalties* totalling *NGN ${total.toLocaleString()}*.\n\n` +
              "Please select the primary reason for your waiver request:",
            menu_options: [
              {
                id: "financial_hardship",
                title: "Financial Hardship",
                description: "Unable to pay due to financial difficulty",
              },
              {
                id: "first_offence",
                title: "First Offence",
                description: "This is my first penalty",
              },
              {
                id: "system_error",
                title: "System Error",
                description: "Filing/payment system was unavailable",
              },
              {
                id: "reasonable_cause",
                title: "Reasonable Cause",
                description: "Illness, natural disaster, etc.",
              },
              {
                id: "other",
                title: "Other",
                description: "Another reason not listed",
              },
            ],
            next_step: 2,
            awaiting_input: "waiver_ground",
          };
        }

        // Selection by number to view specific penalty details
        const idx = parseInt(trimmed, 10) - 1;
        if (!isNaN(idx) && idx >= 0 && idx < penalties.length) {
          console.log('[penaltyQuery.flow::handleInput] branch: numeric selection', { idx });
          const penalty = penalties[idx]!;
          data.selected_penalty = penalty;
          console.log('[penaltyQuery.flow::handleInput] EXIT', { dispatched: 'showPenaltyBreakdown' });
          return this.showPenaltyBreakdown(penalty);
        }

        console.log('[penaltyQuery.flow::handleInput] branch: case 1 default - re-prompt');
        console.log('[penaltyQuery.flow::handleInput] EXIT', { next_step: 1, awaiting_input: 'penalty_selection' });
        return {
          message:
            `Please reply with a number between *1* and *${penalties.length}* to see details, ` +
            "or select an action below:",
          buttons: [
            { id: "waiver_all", title: "Request Waiver (All)" },
            { id: "pay_all", title: "Pay All Penalties" },
            { id: "done", title: "I'm Done" },
          ],
          next_step: 1,
          awaiting_input: "penalty_selection",
        };
      }

      // ------------------------------------------------------------------
      // Step 2: Offer waiver request option / collect waiver ground
      // ------------------------------------------------------------------
      case 2: {
        console.log('[penaltyQuery.flow::handleInput] branch: case 2 - waiver option');
        const trimmed = input.trim().toLowerCase();

        // Handle penalty detail view actions
        if (trimmed === "pay" || trimmed === "pay this penalty") {
          console.log('[penaltyQuery.flow::handleInput] branch: pay single penalty');
          const penalty = data.selected_penalty as { amount: number; penalty_id: string };
          console.log('[penaltyQuery.flow::handleInput] EXIT', { flow_complete: true });
          return {
            message:
              `To pay this penalty of *NGN ${penalty.amount.toLocaleString()}*:\n\n` +
              "1. Visit *remita.net* or your bank\n" +
              `2. Reference: ${penalty.penalty_id}\n\n` +
              "After payment, say *confirm payment* to verify.\n\n" +
              "Is there anything else I can help you with?",
            flow_complete: true,
          };
        }

        if (trimmed === "back" || trimmed === "view all penalties") {
          console.log('[penaltyQuery.flow::handleInput] branch: back to penalties list');
          const tin = data.tin as string;
          console.log('[penaltyQuery.flow::handleInput] EXIT', { dispatched: 'fetchPenalties' });
          return this.fetchPenalties(phone, tin, data);
        }

        if (trimmed === "done" || trimmed === "i'm done") {
          console.log('[penaltyQuery.flow::handleInput] branch: done');
          console.log('[penaltyQuery.flow::handleInput] EXIT', { flow_complete: true });
          return {
            message:
              "Thank you! Type *menu* to see other services.",
            flow_complete: true,
          };
        }

        // Handle waiver request (single penalty from breakdown view)
        if (trimmed === "waiver" || trimmed === "request waiver") {
          console.log('[penaltyQuery.flow::handleInput] branch: waiver single');
          data.waiver_scope = "single";
          console.log('[penaltyQuery.flow::handleInput] EXIT', { next_step: 2, awaiting_input: 'waiver_ground' });
          return {
            message:
              "Please select the primary reason for your waiver request:",
            menu_options: [
              { id: "financial_hardship", title: "Financial Hardship", description: "Unable to pay due to financial difficulty" },
              { id: "first_offence", title: "First Offence", description: "This is my first penalty" },
              { id: "system_error", title: "System Error", description: "Filing/payment system was unavailable" },
              { id: "reasonable_cause", title: "Reasonable Cause", description: "Illness, natural disaster, etc." },
              { id: "other", title: "Other", description: "Another reason not listed" },
            ],
            next_step: 2,
            awaiting_input: "waiver_ground",
          };
        }

        // Handle waiver ground selection
        const validGrounds = [
          "financial_hardship",
          "first_offence",
          "system_error",
          "reasonable_cause",
          "other",
        ];

        if (validGrounds.includes(trimmed)) {
          console.log('[penaltyQuery.flow::handleInput] branch: valid waiver ground', { ground: trimmed });
          data.waiver_ground = trimmed;

          const groundLabels: Record<string, string> = {
            financial_hardship: "Financial Hardship",
            first_offence: "First Offence",
            system_error: "System Error",
            reasonable_cause: "Reasonable Cause",
            other: "Other",
          };

          console.log('[penaltyQuery.flow::handleInput] EXIT', { next_step: 3, awaiting_input: 'waiver_explanation' });
          return {
            message:
              `*Waiver Ground:* ${groundLabels[trimmed]}\n\n` +
              "Please provide a brief explanation to support your waiver request:\n\n" +
              "_For example: Describe the circumstances that led to the penalty, " +
              "any supporting evidence you have, etc._",
            next_step: 3,
            awaiting_input: "waiver_explanation",
          };
        }

        // If free text was typed instead of a menu selection, treat as 'other' ground
        if (trimmed.length > 15) {
          console.log('[penaltyQuery.flow::handleInput] branch: free-text as other ground');
          data.waiver_ground = "other";
          data.waiver_explanation = input.trim();
          console.log('[penaltyQuery.flow::handleInput] EXIT', { dispatched: 'submitWaiverTicket' });
          return this.submitWaiverTicket(phone, data);
        }

        console.log('[penaltyQuery.flow::handleInput] branch: case 2 default re-prompt');
        console.log('[penaltyQuery.flow::handleInput] EXIT', { next_step: 2, awaiting_input: 'penalty_action' });
        return {
          message: "What would you like to do?",
          buttons: [
            { id: "waiver", title: "Request Waiver" },
            { id: "pay", title: "Pay Penalty" },
            { id: "back", title: "View All Penalties" },
            { id: "done", title: "I'm Done" },
          ],
          next_step: 2,
          awaiting_input: "penalty_action",
        };
      }

      // ------------------------------------------------------------------
      // Step 3: Create PEN-WAIVER ITSM ticket
      // ------------------------------------------------------------------
      case 3: {
        console.log('[penaltyQuery.flow::handleInput] branch: case 3 - waiver explanation');
        const explanation = input.trim();

        if (explanation.length < 10) {
          console.log('[penaltyQuery.flow::handleInput] branch: explanation too short');
          console.log('[penaltyQuery.flow::handleInput] EXIT', { next_step: 3, awaiting_input: 'waiver_explanation' });
          return {
            message:
              "Please provide a more detailed explanation (at least a few sentences) to support your waiver request:",
            next_step: 3,
            awaiting_input: "waiver_explanation",
          };
        }

        data.waiver_explanation = explanation;
        console.log('[penaltyQuery.flow::handleInput] branch: submitting waiver ticket');
        console.log('[penaltyQuery.flow::handleInput] EXIT', { dispatched: 'submitWaiverTicket' });
        return this.submitWaiverTicket(phone, data);
      }

      default:
        console.log('[penaltyQuery.flow::handleInput] branch: default case - unknown step');
        console.log('[penaltyQuery.flow::handleInput] EXIT', { next_step: 0, awaiting_input: 'tin' });
        return {
          message:
            "Something went wrong. Let's start the penalty query again.",
          next_step: 0,
          awaiting_input: "tin",
        };
    }
  }

  /** Fetch penalties from TaxProMax compliance endpoint and display them */
  private async fetchPenalties(
    phone: string,
    tin: string,
    data: Record<string, unknown>,
  ): Promise<FlowStepResult> {
    console.log('[penaltyQuery.flow::fetchPenalties] ENTER', { phone, tinPreview: tin.slice(0, 3) + '***' });
    const compliance = await taxProMaxService.getComplianceStatus(tin);

    if (!compliance.success || !compliance.data) {
      console.log('[penaltyQuery.flow::fetchPenalties] branch: compliance lookup failed');
      console.log('[penaltyQuery.flow::fetchPenalties] EXIT', { flow_complete: true });
      return {
        message:
          "I was unable to retrieve your penalty information at this time.\n\n" +
          "This may be due to a temporary system issue. Please try again later " +
          "or contact your tax office.\n\n" +
          "Type *menu* to see other services.",
        flow_complete: true,
      };
    }

    const penalties = compliance.data.penalties;

    if (!penalties || penalties.length === 0) {
      console.log('[penaltyQuery.flow::fetchPenalties] branch: no penalties');
      console.log('[penaltyQuery.flow::fetchPenalties] EXIT', { flow_complete: true });
      return {
        message:
          `Great news! There are *no penalties* currently on your tax account (TIN: ${tin.slice(0, 3)}****${tin.slice(-2)}).\n\n` +
          "Keep up with your filing and payment deadlines to stay penalty-free!\n\n" +
          "Is there anything else I can help you with?",
        flow_complete: true,
      };
    }

    data.penalties = penalties;
    const totalPenalties = penalties.reduce((sum, p) => sum + p.amount, 0);
    const outstandingCount = penalties.filter((p) => p.status === "outstanding").length;
    console.log('[penaltyQuery.flow::fetchPenalties] branch: penalties found', { count: penalties.length, totalPenalties, outstandingCount });

    const listing = penalties.map((p, i) => {
      const typeLabel = p.type.replace(/_/g, " ").toUpperCase();
      return (
        `${i + 1}. *${typeLabel}*\n` +
        `   Amount: NGN ${p.amount.toLocaleString()}\n` +
        `   Reason: ${p.reason}\n` +
        `   Statutory Basis: ${p.statutory_basis ?? "N/A"}\n` +
        `   Status: ${p.status.toUpperCase()}`
      );
    }).join("\n\n");

    console.log('[penaltyQuery.flow::fetchPenalties] EXIT', { next_step: 1, awaiting_input: 'penalty_selection' });
    return {
      message:
        `*Penalties on Your Account (TIN: ${tin.slice(0, 3)}****${tin.slice(-2)})*\n\n` +
        listing +
        `\n\n*Total Penalties: NGN ${totalPenalties.toLocaleString()}*` +
        (outstandingCount > 0 ? ` (*${outstandingCount} outstanding*)` : "") +
        "\n\nReply with a number to see the full breakdown, or choose an action:",
      buttons: [
        { id: "waiver_all", title: "Request Waiver (All)" },
        { id: "pay_all", title: "Pay All Penalties" },
        { id: "done", title: "I'm Done" },
      ],
      next_step: 1,
      awaiting_input: "penalty_selection",
    };
  }

  /** Show a detailed breakdown of a single penalty */
  private showPenaltyBreakdown(penalty: {
    penalty_id: string;
    type: string;
    amount: number;
    reason: string;
    statutory_basis?: string;
    original_due_date?: string;
    status: string;
  }): FlowStepResult {
    console.log('[penaltyQuery.flow::showPenaltyBreakdown] ENTER', { penalty_id: penalty.penalty_id, type: penalty.type });
    const typeLabel = penalty.type.replace(/_/g, " ").toUpperCase();
    const explanation = this.getStatutoryExplanation(penalty.statutory_basis);

    console.log('[penaltyQuery.flow::showPenaltyBreakdown] EXIT', { next_step: 2, awaiting_input: 'penalty_action' });
    return {
      message:
        `*Penalty Breakdown*\n\n` +
        `ID: ${penalty.penalty_id}\n` +
        `Type: ${typeLabel}\n` +
        `Amount: NGN ${penalty.amount.toLocaleString()}\n` +
        `Reason: ${penalty.reason}\n` +
        `Statutory Basis: ${penalty.statutory_basis ?? "N/A"}\n` +
        `Original Due Date: ${penalty.original_due_date ?? "N/A"}\n` +
        `Status: *${penalty.status.toUpperCase()}*\n\n` +
        explanation +
        "\nWhat would you like to do?",
      buttons: [
        { id: "waiver", title: "Request Waiver" },
        { id: "pay", title: "Pay This Penalty" },
        { id: "back", title: "View All Penalties" },
        { id: "done", title: "I'm Done" },
      ],
      next_step: 2,
      awaiting_input: "penalty_action",
    };
  }

  /** Provide a brief explanation of the statutory basis */
  private getStatutoryExplanation(basis?: string): string {
    console.log('[penaltyQuery.flow::getStatutoryExplanation] ENTER', { basis });
    if (!basis) {
      console.log('[penaltyQuery.flow::getStatutoryExplanation] branch: no basis');
      console.log('[penaltyQuery.flow::getStatutoryExplanation] EXIT', { result: 'empty' });
      return "";
    }

    const explanations: Record<string, string> = {
      "Section 81(2) PITA":
        "_Section 81(2) of the Personal Income Tax Act imposes penalties for late filing of returns._\n",
      "Section 55 CITA":
        "_Section 55 of the Companies Income Tax Act prescribes penalties for failure to file returns._\n",
      "Section 40 VAT Act":
        "_Section 40 of the VAT Act provides for penalties on late remittance of VAT._\n",
      "Section 32(1) PITA":
        "_Section 32(1) of PITA prescribes penalties for late payment of assessed tax._\n",
    };

    const result = explanations[basis] ?? `_Statutory reference: ${basis}_\n`;
    console.log('[penaltyQuery.flow::getStatutoryExplanation] EXIT', { hasMatch: !!explanations[basis] });
    return result;
  }

  /** Submit the penalty waiver request as a PEN-WAIVER ITSM ticket */
  private async submitWaiverTicket(
    phone: string,
    data: Record<string, unknown>,
  ): Promise<FlowStepResult> {
    console.log('[penaltyQuery.flow::submitWaiverTicket] ENTER', { phone, scope: data.waiver_scope });
    const waiverScope = data.waiver_scope as string;
    const tin = (data.tin as string) ?? "N/A";

    const penalty = data.selected_penalty as {
      penalty_id: string;
      type: string;
      amount: number;
    } | null;

    const penalties = data.penalties as Array<{ penalty_id: string; amount: number }>;

    const totalAmount =
      waiverScope === "all"
        ? penalties.reduce((s, p) => s + p.amount, 0)
        : penalty?.amount ?? 0;

    const groundLabels: Record<string, string> = {
      financial_hardship: "Financial Hardship",
      first_offence: "First Offence",
      system_error: "System Error",
      reasonable_cause: "Reasonable Cause",
      other: "Other",
    };

    const penaltyDescription =
      waiverScope === "all"
        ? `All penalties on account (${penalties.length} total)`
        : `Single penalty: ${penalty?.penalty_id ?? "N/A"}`;

    console.log('[penaltyQuery.flow::submitWaiverTicket] branch: creating PEN-WAIVER ticket', { totalAmount, scope: waiverScope });
    const ticketResult = await itsmService.createTicket({
      type: "PEN-WAIVER",
      subject:
        `Penalty Waiver Request - TIN ${tin} - NGN ${totalAmount.toLocaleString()}`,
      description:
        `TIN: ${tin}\n` +
        `Phone: ${phone}\n` +
        `Scope: ${penaltyDescription}\n` +
        `Total Amount: NGN ${totalAmount.toLocaleString()}\n` +
        `Ground: ${groundLabels[data.waiver_ground as string] ?? data.waiver_ground}\n` +
        `Explanation: ${data.waiver_explanation as string}`,
      taxpayer_tin: tin,
      phone,
      priority: "medium",
    });

    if (!ticketResult.success) {
      console.log('[penaltyQuery.flow::submitWaiverTicket] branch: ticket creation failed');
      console.log('[penaltyQuery.flow::submitWaiverTicket] EXIT', { flow_complete: true, error: 'ticket creation failed' });
      return {
        message:
          "I'm sorry, there was an issue submitting your waiver request.\n\n" +
          "Please try again later or submit a formal waiver letter to your tax office.\n\n" +
          "Type *menu* to see other services.",
        flow_complete: true,
      };
    }

    console.log('[penaltyQuery.flow::submitWaiverTicket] branch: ticket created', { reference: ticketResult.data!.reference });
    console.log('[penaltyQuery.flow::submitWaiverTicket] EXIT', { flow_complete: true });
    return {
      message:
        `Your penalty waiver request has been submitted!\n\n` +
        `*Ticket Reference:* ${ticketResult.data!.reference}\n` +
        `*Penalties:* ${penaltyDescription}\n` +
        `*Amount:* NGN ${totalAmount.toLocaleString()}\n` +
        `*Ground:* ${groundLabels[data.waiver_ground as string] ?? data.waiver_ground}\n` +
        `*SLA:* A tax officer will review within 5 business days\n\n` +
        "You will be notified via WhatsApp once a decision is made.\n\n" +
        `Keep your reference (${ticketResult.data!.reference}) for tracking purposes.\n\n` +
        "Is there anything else I can help you with?",
      flow_complete: true,
    };
  }
}

export default new PenaltyQueryFlow();
