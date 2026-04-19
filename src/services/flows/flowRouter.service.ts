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
    console.log('[flowRouter.service::startFlow] ENTER', { phone, flowName, entityKeys: entities ? Object.keys(entities) : [] });
    // Check auth requirement
    const authCheck = await authService.checkAuthForFlow(phone, flowName);

    if (!authCheck.authorized) {
      console.log('[flowRouter.service::startFlow] branch: auth required - saving pending flow', { requiredTier: authCheck.requiredTier });
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
      console.log('[flowRouter.service::startFlow] EXIT', { authRequired: true, awaiting: authResult.requires_next || 'tin' });
      return;
    }

    console.log('[flowRouter.service::startFlow] branch: authorized - initializing flow');
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
    console.log('[flowRouter.service::startFlow] branch: invoking handler.start', { flowName });
    const result = await handler.start(phone, entities);
    await this.processFlowResult(phone, flowName, result);

    await auditLogService.log(phone, "flow_started", { flow: flowName });
    console.log('[flowRouter.service::startFlow] EXIT', { flowName, started: true });
  }

  async continueFlow(phone: string, input: string): Promise<void> {
    console.log('[flowRouter.service::continueFlow] ENTER', { phone, inputLen: input.length, inputPreview: input.slice(0, 3) + '***' });
    const context = await ConversationContext.findOne({ phone });
    if (!context) {
      console.log('[flowRouter.service::continueFlow] branch: no context found');
      console.log('[flowRouter.service::continueFlow] EXIT', { reason: 'no context' });
      return;
    }

    // Handle auth flow continuation
    if (context.current_flow === "auth") {
      console.log('[flowRouter.service::continueFlow] branch: auth flow - delegating to handleAuthInput');
      await this.handleAuthInput(phone, input, context);
      console.log('[flowRouter.service::continueFlow] EXIT', { branch: 'auth' });
      return;
    }

    const flowName = context.current_flow as FlowName;
    if (!flowName || !FLOW_HANDLERS[flowName]) {
      console.log('[flowRouter.service::continueFlow] branch: invalid/missing flow handler', { flowName });
      await whatsappService.sendMessage(
        phone,
        "Something went wrong. Type MENU to start over.",
      );
      console.log('[flowRouter.service::continueFlow] EXIT', { error: 'invalid flow' });
      return;
    }

    console.log('[flowRouter.service::continueFlow] branch: invoking handler.handleInput', { flowName, step: context.current_step ?? 0 });
    const handler = FLOW_HANDLERS[flowName];
    const result = await handler.handleInput(
      phone,
      input,
      context.current_step ?? 0,
      (context.flow_data as Record<string, unknown>) || {},
    );

    await this.processFlowResult(phone, flowName, result);
    console.log('[flowRouter.service::continueFlow] EXIT', { flowName, nextStep: result.next_step, flow_complete: result.flow_complete });
  }

  private async processFlowResult(
    phone: string,
    flowName: string,
    result: FlowStepResult,
  ): Promise<void> {
    console.log('[flowRouter.service::processFlowResult] ENTER', { phone, flowName, hasMessage: !!result.message, hasMenu: !!result.menu_options, hasButtons: !!result.buttons, flow_complete: result.flow_complete });
    // Send message
    if (result.message) {
      console.log('[flowRouter.service::processFlowResult] branch: sending message');
      await whatsappService.sendMessage(phone, result.message);
    }

    // Send menu options as interactive list
    if (result.menu_options && result.menu_options.length > 0) {
      console.log('[flowRouter.service::processFlowResult] branch: sending menu options', { count: result.menu_options.length });
      await menuService.sendSubMenu(
        phone,
        "NRS TaxChat",
        "Please select an option:",
        result.menu_options,
      );
    }

    // Send buttons
    if (result.buttons && result.buttons.length > 0) {
      console.log('[flowRouter.service::processFlowResult] branch: sending buttons', { count: result.buttons.length });
      await whatsappService.sendInteractiveButtonMessage(
        phone,
        result.message || "Please select:",
        result.buttons,
      );
    }

    // Send WhatsApp Flow
    if (result.flow_message) {
      console.log('[flowRouter.service::processFlowResult] branch: sending flow_message');
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
      console.log('[flowRouter.service::processFlowResult] branch: escalation requested', { reason: result.escalation_reason });
      const { default: escService } = await import("../escalation/escalation.service.js");
      await escService.escalateToAgent(
        phone,
        result.escalation_reason || "Flow requested escalation",
      );
      console.log('[flowRouter.service::processFlowResult] EXIT', { escalated: true });
      return;
    }

    // Update context
    if (result.flow_complete) {
      console.log('[flowRouter.service::processFlowResult] branch: flow_complete - clearing context');
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
      console.log('[flowRouter.service::processFlowResult] branch: updating step/awaiting_input', { next_step: result.next_step, awaiting_input: result.awaiting_input });
      await ConversationContext.findOneAndUpdate(
        { phone },
        {
          current_step: result.next_step,
          awaiting_input: result.awaiting_input,
          last_message_at: new Date(),
        },
      );
    }
    console.log('[flowRouter.service::processFlowResult] EXIT', { flow_complete: result.flow_complete });
  }

  private async handleAuthInput(
    phone: string,
    input: string,
    context: InstanceType<typeof ConversationContext>,
  ): Promise<void> {
    console.log('[flowRouter.service::handleAuthInput] ENTER', { phone, awaiting: context.awaiting_input, inputLen: input.length });
    const awaiting = context.awaiting_input;

    if (awaiting === "tin") {
      console.log('[flowRouter.service::handleAuthInput] branch: verifying TIN');
      const result = await authService.verifyTIN(phone, input);
      await whatsappService.sendMessage(phone, result.message);

      if (result.requires_next === "otp") {
        console.log('[flowRouter.service::handleAuthInput] branch: TIN accepted - awaiting OTP');
        await ConversationContext.findOneAndUpdate(
          { phone },
          { awaiting_input: "otp" },
        );
      }
    } else if (awaiting === "otp") {
      console.log('[flowRouter.service::handleAuthInput] branch: verifying OTP');
      const result = await authService.verifyOTP(phone, input);
      await whatsappService.sendMessage(phone, result.message);

      if (result.success) {
        console.log('[flowRouter.service::handleAuthInput] branch: OTP verified');
        // Check if we need higher tier
        const pendingFlow = context.pending_auth_flow as FlowName | undefined;
        if (pendingFlow) {
          const check = await authService.checkAuthForFlow(phone, pendingFlow);
          if (check.authorized) {
            console.log('[flowRouter.service::handleAuthInput] branch: authorized - resuming pending flow', { pendingFlow });
            // Resume the pending flow
            await this.startFlow(phone, pendingFlow);
          } else {
            console.log('[flowRouter.service::handleAuthInput] branch: need higher tier (NIN/BVN)');
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
      console.log('[flowRouter.service::handleAuthInput] branch: verifying NIN/BVN');
      // Determine if NIN or BVN based on format
      const type = input.length === 11 ? "nin" : "nin"; // Default to NIN
      const result = await authService.verifyIdentity(phone, type, input);
      await whatsappService.sendMessage(phone, result.message);

      if (result.success) {
        console.log('[flowRouter.service::handleAuthInput] branch: identity verified');
        const pendingFlow = context.pending_auth_flow as FlowName | undefined;
        if (pendingFlow) {
          console.log('[flowRouter.service::handleAuthInput] branch: resuming pending flow', { pendingFlow });
          await this.startFlow(phone, pendingFlow);
        }
      }
    }
    console.log('[flowRouter.service::handleAuthInput] EXIT', { awaiting });
  }
}

export default new FlowRouterService();
