import type { FlowName, FlowStepResult } from "../../types/conversation.types.js";
import authService from "../auth/auth.service.js";
import ConversationContext from "../../models/conversationContext.model.js";
import whatsappService from "../whatsapp/whatsapp.service.js";
import menuService from "../conversation/menu.service.js";
import auditLogService from "../auditLog.service.js";

// Import all flow handlers
import tinRegistrationFlow from "./tinRegistration.flow.js";
import tinRetrievalFlow from "./tinRetrieval.flow.js";
import taxClearanceFlow from "./taxClearance.flow.js";
import paymentConfirmationFlow from "./paymentConfirmation.flow.js";
import profileUpdateFlow from "./profileUpdate.flow.js";
import filingSupportFlow from "./filingSupport.flow.js";
import assessmentQueryFlow from "./assessmentQuery.flow.js";
import penaltyQueryFlow from "./penaltyQuery.flow.js";
import whtCreditNoteFlow from "./whtCreditNote.flow.js";
import generalEnquiryFlow from "./generalEnquiry.flow.js";

interface FlowHandler {
  start(phone: string, entities?: Record<string, string>): Promise<FlowStepResult>;
  handleInput(phone: string, input: string, step: number, data: Record<string, unknown>): Promise<FlowStepResult>;
}

const FLOW_HANDLERS: Record<FlowName, FlowHandler> = {
  tin_registration: tinRegistrationFlow,
  tin_retrieval: tinRetrievalFlow,
  tax_clearance: taxClearanceFlow,
  payment_confirmation: paymentConfirmationFlow,
  profile_update: profileUpdateFlow,
  filing_support: filingSupportFlow,
  assessment_query: assessmentQueryFlow,
  penalty_query: penaltyQueryFlow,
  wht_credit_note: whtCreditNoteFlow,
  general_enquiry: generalEnquiryFlow,
};

class FlowRouterService {
  async startFlow(
    phone: string,
    flowName: FlowName,
    entities?: Record<string, string>,
  ): Promise<void> {
    // Check auth requirement
    const authCheck = await authService.checkAuthForFlow(phone, flowName);

    if (!authCheck.authorized) {
      // Save pending flow and initiate auth
      await ConversationContext.findOneAndUpdate(
        { phone },
        {
          pending_auth_flow: flowName,
          flow_data: entities || {},
          last_message_at: new Date(),
        },
        { upsert: true, new: true },
      );

      const authResult = await authService.initiateAuth(
        phone,
        authCheck.requiredTier,
      );

      await whatsappService.sendMessage(phone, authResult.message);

      // Set up awaiting input for auth
      await ConversationContext.findOneAndUpdate(
        { phone },
        {
          current_flow: "auth" as string,
          awaiting_input: authResult.requires_next || "tin",
        },
      );
      return;
    }

    // Initialize conversation context for the flow
    await ConversationContext.findOneAndUpdate(
      { phone },
      {
        current_flow: flowName,
        current_step: 0,
        flow_data: entities || {},
        awaiting_input: null,
        pending_auth_flow: undefined,
        last_message_at: new Date(),
      },
      { upsert: true, new: true },
    );

    // Start the flow
    const handler = FLOW_HANDLERS[flowName];
    const result = await handler.start(phone, entities);
    await this.processFlowResult(phone, flowName, result);

    await auditLogService.log(phone, "flow_started", { flow: flowName });
  }

  async continueFlow(phone: string, input: string): Promise<void> {
    const context = await ConversationContext.findOne({ phone });
    if (!context) return;

    // Handle auth flow continuation
    if (context.current_flow === "auth") {
      await this.handleAuthInput(phone, input, context);
      return;
    }

    const flowName = context.current_flow as FlowName;
    if (!flowName || !FLOW_HANDLERS[flowName]) {
      await whatsappService.sendMessage(
        phone,
        "Something went wrong. Type MENU to start over.",
      );
      return;
    }

    const handler = FLOW_HANDLERS[flowName];
    const result = await handler.handleInput(
      phone,
      input,
      context.current_step ?? 0,
      (context.flow_data as Record<string, unknown>) || {},
    );

    await this.processFlowResult(phone, flowName, result);
  }

  private async processFlowResult(
    phone: string,
    flowName: string,
    result: FlowStepResult,
  ): Promise<void> {
    // Send message
    if (result.message) {
      await whatsappService.sendMessage(phone, result.message);
    }

    // Send menu options as interactive list
    if (result.menu_options && result.menu_options.length > 0) {
      await menuService.sendSubMenu(
        phone,
        "NRS TaxChat",
        "Please select an option:",
        result.menu_options,
      );
    }

    // Send buttons
    if (result.buttons && result.buttons.length > 0) {
      await whatsappService.sendInteractiveButtonMessage(
        phone,
        result.message || "Please select:",
        result.buttons,
      );
    }

    // Send WhatsApp Flow
    if (result.flow_message) {
      await whatsappService.sendFlowMessage(
        phone,
        result.flow_message.flow_token,
        result.flow_message.flow_id,
        result.message || "Please continue",
        result.flow_message.cta,
        result.flow_message.screen,
      );
    }

    // Handle escalation
    if (result.escalate) {
      const { default: escService } = await import("../escalation/escalation.service.js");
      await escService.escalateToAgent(
        phone,
        result.escalation_reason || "Flow requested escalation",
      );
      return;
    }

    // Update context
    if (result.flow_complete) {
      await ConversationContext.findOneAndUpdate(
        { phone },
        {
          current_flow: undefined,
          current_step: undefined,
          flow_data: {},
          awaiting_input: undefined,
        },
      );

      // Offer to continue
      await whatsappService.sendMessage(
        phone,
        "Is there anything else I can help with? Type MENU to see all services.",
      );
    } else {
      await ConversationContext.findOneAndUpdate(
        { phone },
        {
          current_step: result.next_step,
          awaiting_input: result.awaiting_input,
          last_message_at: new Date(),
        },
      );
    }
  }

  private async handleAuthInput(
    phone: string,
    input: string,
    context: InstanceType<typeof ConversationContext>,
  ): Promise<void> {
    const awaiting = context.awaiting_input;

    if (awaiting === "tin") {
      const result = await authService.verifyTIN(phone, input);
      await whatsappService.sendMessage(phone, result.message);

      if (result.requires_next === "otp") {
        await ConversationContext.findOneAndUpdate(
          { phone },
          { awaiting_input: "otp" },
        );
      }
    } else if (awaiting === "otp") {
      const result = await authService.verifyOTP(phone, input);
      await whatsappService.sendMessage(phone, result.message);

      if (result.success) {
        // Check if we need higher tier
        const pendingFlow = context.pending_auth_flow as FlowName | undefined;
        if (pendingFlow) {
          const check = await authService.checkAuthForFlow(phone, pendingFlow);
          if (check.authorized) {
            // Resume the pending flow
            await this.startFlow(phone, pendingFlow);
          } else {
            // Need more auth (NIN/BVN)
            await ConversationContext.findOneAndUpdate(
              { phone },
              { awaiting_input: "nin_bvn" },
            );
            await whatsappService.sendMessage(
              phone,
              "Please provide your NIN or BVN for identity verification.",
            );
          }
        }
      }
    } else if (awaiting === "nin_bvn") {
      // Determine if NIN or BVN based on format
      const type = input.length === 11 ? "nin" : "nin"; // Default to NIN
      const result = await authService.verifyIdentity(phone, type, input);
      await whatsappService.sendMessage(phone, result.message);

      if (result.success) {
        const pendingFlow = context.pending_auth_flow as FlowName | undefined;
        if (pendingFlow) {
          await this.startFlow(phone, pendingFlow);
        }
      }
    }
  }
}

export default new FlowRouterService();
