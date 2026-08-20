import type { FlowName, FlowStepResult } from "../../types/conversation.types.js";
import authService from "../auth/auth.service.js";
import ConversationContext from "../../models/conversationContext.model.js";
import whatsappService from "../whatsapp/whatsapp.service.js";
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
  start(phone: string, entities?: Record<string, string>, data?: Record<string, unknown>): Promise<FlowStepResult>;
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

/**
 * Entities extracted before an auth detour are parked in `flow_data` by
 * startFlow. Resuming without them would discard everything the taxpayer
 * already told us and re-ask for it after they authenticate.
 */
function stashedEntities(
  context: InstanceType<typeof ConversationContext>,
): Record<string, string> {
  const stash = (context.flow_data as Record<string, unknown> | undefined) ?? {};
  const entities: Record<string, string> = {};
  for (const [key, value] of Object.entries(stash)) {
    if (typeof value === "string") entities[key] = value;
  }
  return entities;
}

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
    // Seed the flow-data object from any entities the NLU extracted. This same
    // instance is handed to the flow and written back by processFlowResult, so
    // anything the flow records during start() survives to the next turn.
    const flowData: Record<string, unknown> = { ...(entities ?? {}) };


    // Initialize conversation context for the flow
    await ConversationContext.findOneAndUpdate(
      { phone },
      {
        $set: {
          current_flow: flowName,
          current_step: 0,
          flow_data: flowData,
          last_message_at: new Date(),
        },
        $unset: { awaiting_input: 1, pending_auth_flow: 1 },
      },
      { upsert: true, new: true },
    );

    // Start the flow
    const handler = FLOW_HANDLERS[flowName];
    console.log('[flowRouter.service::startFlow] branch: invoking handler.start', { flowName });
    const result = await handler.start(phone, entities, flowData);
    await this.processFlowResult(phone, flowName, result, flowData);

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
    // Hold a reference to the object the flow mutates so processFlowResult can
    // write it back; without this every value the flow collects is discarded.
    const flowData: Record<string, unknown> = {
      ...((context.flow_data as Record<string, unknown>) ?? {}),
    };
    const result = await handler.handleInput(
      phone,
      input,
      context.current_step ?? 0,
      flowData,
    );

    await this.processFlowResult(phone, flowName, result, flowData);
    console.log('[flowRouter.service::continueFlow] EXIT', { flowName, nextStep: result.next_step, flow_complete: result.flow_complete });
  }

  /**
   * Renders a flow's result to WhatsApp and persists the resulting conversation
   * state.
   *
   * `flowData` is the same object instance that was handed to the flow handler.
   * Flows accumulate state by mutating it in place, so it must be written back
   * here - it is the only point at which collected input becomes durable.
   */
  private async processFlowResult(
    phone: string,
    flowName: string,
    result: FlowStepResult,
    flowData: Record<string, unknown>,
  ): Promise<void> {
    console.log('[flowRouter.service::processFlowResult] ENTER', { phone, flowName, hasMessage: !!result.message, hasMenu: !!result.menu_options, hasButtons: !!result.buttons, flow_complete: result.flow_complete, flowDataKeys: Object.keys(flowData) });

    // Exactly one outbound message per result. `message` is the body of
    // whichever interactive element is present, never a separate send - sending
    // it standalone as well would show the taxpayer the same text twice.
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
    } else if (result.buttons && result.buttons.length > 0) {
      console.log('[flowRouter.service::processFlowResult] branch: sending buttons', { count: result.buttons.length });
      await whatsappService.sendChoice(
        phone,
        result.message || "Please select an option:",
        result.buttons,
      );
    } else if (result.menu_options && result.menu_options.length > 0) {
      console.log('[flowRouter.service::processFlowResult] branch: sending menu options', { count: result.menu_options.length });
      await whatsappService.sendChoice(
        phone,
        result.message || "Please select an option:",
        result.menu_options,
      );
    } else if (result.message) {
      console.log('[flowRouter.service::processFlowResult] branch: sending message');
      await whatsappService.sendMessage(phone, result.message);
    }

    // Handle escalation. Persist first: escalateToAgent can fail, in which case
    // the taxpayer is told to retry later and must not lose their progress.
    if (result.escalate) {
      console.log('[flowRouter.service::processFlowResult] branch: escalation requested', { reason: result.escalation_reason });
      await ConversationContext.findOneAndUpdate(
        { phone },
        { $set: { flow_data: flowData, last_message_at: new Date() } },
      );
      const { default: escService } = await import("../escalation/escalation.service.js");
      await escService.escalateToAgent(
        phone,
        result.escalation_reason || "Flow requested escalation",
      );
      console.log('[flowRouter.service::processFlowResult] EXIT', { escalated: true });
      return;
    }

    // Update context. Mongoose strips `undefined` values out of update
    // documents, so clearing a field requires $unset - assigning `undefined`
    // silently leaves the old value in place.
    if (result.flow_complete) {
      console.log('[flowRouter.service::processFlowResult] branch: flow_complete - clearing context');
      await ConversationContext.findOneAndUpdate(
        { phone },
        {
          $set: { flow_data: {}, last_message_at: new Date() },
          $unset: { current_flow: 1, current_step: 1, awaiting_input: 1 },
        },
      );

      // Hand over to the next flow if one was named, rather than ending here.
      if (result.next_flow && FLOW_HANDLERS[result.next_flow]) {
        console.log('[flowRouter.service::processFlowResult] branch: chaining to next flow', { from: flowName, to: result.next_flow });
        await this.startFlow(phone, result.next_flow);
        console.log('[flowRouter.service::processFlowResult] EXIT', { chainedTo: result.next_flow });
        return;
      }

      // Only add a closing line if the flow did not write its own. Twenty of
      // the flows' completion messages already end with "Is there anything
      // else...", and appending this on top sends the taxpayer the same
      // question twice at the end of every single flow.
      if (!result.message) {
        await whatsappService.sendMessage(
          phone,
          "Is there anything else I can help with? Type MENU to see all services.",
        );
      }
    } else {
      console.log('[flowRouter.service::processFlowResult] branch: updating step/awaiting_input', { next_step: result.next_step, awaiting_input: result.awaiting_input });
      const set: Record<string, unknown> = {
        flow_data: flowData,
        last_message_at: new Date(),
      };
      const unset: Record<string, 1> = {};

      if (result.next_step === undefined) unset.current_step = 1;
      else set.current_step = result.next_step;

      if (result.awaiting_input === undefined || result.awaiting_input === null) unset.awaiting_input = 1;
      else set.awaiting_input = result.awaiting_input;

      const update: Record<string, unknown> = { $set: set };
      if (Object.keys(unset).length > 0) update.$unset = unset;

      await ConversationContext.findOneAndUpdate({ phone }, update);
    }
    console.log('[flowRouter.service::processFlowResult] EXIT', { flow_complete: result.flow_complete, persistedKeys: Object.keys(flowData) });
  }

  private async handleAuthInput(
    phone: string,
    input: string,
    context: InstanceType<typeof ConversationContext>,
  ): Promise<void> {
    console.log('[flowRouter.service::handleAuthInput] ENTER', { phone, awaiting: context.awaiting_input, inputLen: input.length });
    const awaiting = context.awaiting_input;

    if (awaiting === "tin") {
      // Validate before calling out. The flows all require a 10-digit TIN, so
      // accepting anything here means a TIN that authenticates fine is then
      // rejected by the very flow it unlocked.
      const tin = input.replace(/[\s-]/g, "");
      if (!/^\d{10}$/.test(tin)) {
        console.log('[flowRouter.service::handleAuthInput] branch: TIN failed format check', { length: tin.length });
        await whatsappService.sendMessage(
          phone,
          "A TIN is a *10-digit number*. Please check and re-enter it.\n\n" +
            "_You can find it on previous tax documents. Type *MENU* to start over, or *AGENT* to speak with an officer._",
        );
        console.log('[flowRouter.service::handleAuthInput] EXIT', { branch: 'tin-invalid' });
        return;
      }

      console.log('[flowRouter.service::handleAuthInput] branch: verifying TIN');
      const result = await authService.verifyTIN(phone, tin);
      await whatsappService.sendMessage(phone, result.message);

      if (result.requires_next === "otp") {
        console.log('[flowRouter.service::handleAuthInput] branch: TIN accepted - awaiting OTP');
        await ConversationContext.findOneAndUpdate(
          { phone },
          { awaiting_input: "otp" },
        );
      }
    } else if (awaiting === "otp") {
      const code = input.trim();

      // Let the taxpayer ask for another code. Without this an expired or
      // undelivered code is a dead end: every further message is read as a
      // verification attempt and answered with "No active OTP found".
      if (/^(resend|resend code|new code|send again)$/i.test(code)) {
        console.log('[flowRouter.service::handleAuthInput] branch: OTP resend requested');
        const resent = await authService.resendOTP(phone);
        await whatsappService.sendMessage(phone, resent.message);
        console.log('[flowRouter.service::handleAuthInput] EXIT', { branch: 'otp-resend' });
        return;
      }

      // Anything that is not six digits is far more likely to be the taxpayer
      // talking than a verification attempt.
      if (!/^\d{6}$/.test(code)) {
        console.log('[flowRouter.service::handleAuthInput] branch: input is not a 6-digit code');
        await whatsappService.sendMessage(
          phone,
          "I'm waiting for the *6-digit verification code*.\n\n" +
            "Reply *RESEND* for a new code, *MENU* to start over, or *AGENT* to speak with an officer.",
        );
        console.log('[flowRouter.service::handleAuthInput] EXIT', { branch: 'otp-not-a-code' });
        return;
      }

      console.log('[flowRouter.service::handleAuthInput] branch: verifying OTP');
      const result = await authService.verifyOTP(phone, code);
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
            await this.startFlow(phone, pendingFlow, stashedEntities(context));
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
      // NIN and BVN are both 11 digits, so length cannot tell them apart. Try
      // NIN first and fall back to BVN rather than silently never checking BVN.
      const type = "nin" as const;
      let result = await authService.verifyIdentity(phone, type, input);
      if (!result.success) {
        console.log('[flowRouter.service::handleAuthInput] branch: NIN failed, retrying as BVN');
        result = await authService.verifyIdentity(phone, "bvn", input);
      }
      await whatsappService.sendMessage(phone, result.message);

      if (result.success) {
        console.log('[flowRouter.service::handleAuthInput] branch: identity verified');
        const pendingFlow = context.pending_auth_flow as FlowName | undefined;
        if (pendingFlow) {
          console.log('[flowRouter.service::handleAuthInput] branch: resuming pending flow', { pendingFlow });
          await this.startFlow(phone, pendingFlow, stashedEntities(context));
        }
      }
    } else if (awaiting === "kyc") {
      console.log('[flowRouter.service::handleAuthInput] branch: verifying KYC (NIN)');
      const result = await authService.verifyKYC(phone, input);
      await whatsappService.sendMessage(phone, result.message);

      if (result.success) {
        console.log('[flowRouter.service::handleAuthInput] branch: KYC verified');
        const pendingFlow = context.pending_auth_flow as FlowName | undefined;
        if (pendingFlow) {
          console.log('[flowRouter.service::handleAuthInput] branch: resuming pending flow', { pendingFlow });
          await this.startFlow(phone, pendingFlow, stashedEntities(context));
        }
      }
    } else {
      console.log('[flowRouter.service::handleAuthInput] branch: unknown awaiting_input value', { awaiting });
      await whatsappService.sendMessage(
        phone,
        "Something went wrong with your session. Type MENU to start over.",
      );
    }
    console.log('[flowRouter.service::handleAuthInput] EXIT', { awaiting });
  }
}

export default new FlowRouterService();
