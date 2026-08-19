import ConversationContext from "../../models/conversationContext.model.js";
import Taxpayer from "../../models/taxpayer.model.js";
import akraaAI from "../integrations/claude.service.js";
import authService from "../auth/auth.service.js";
import sessionService from "../auth/session.service.js";
import flowRouter from "../flows/flowRouter.service.js";
import menuService from "./menu.service.js";
import whatsappService from "../whatsapp/whatsapp.service.js";
import escalationService from "../escalation/escalation.service.js";
import auditLogService from "../auditLog.service.js";
import type { IncomingMessageContext } from "../../types/conversation.types.js";
import type { FlowName } from "../../types/conversation.types.js";
import {
  ESCALATION_KEYWORDS,
  ESCALATION_PHRASES,
  MENU_KEYWORDS,
  GREETING_KEYWORDS,
  MAIN_MENU_OPTIONS,
} from "../../utils/constants.js";

/** Strips surrounding punctuation so "help!" and "agent." still match exactly. */
function normalizeForKeywords(text: string): string {
  return text.toLowerCase().trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

/** True when the taxpayer is asking for a human, not merely using the word. */
function isEscalationRequest(normalizedText: string): boolean {
  if (ESCALATION_KEYWORDS.includes(normalizedText)) return true;
  return ESCALATION_PHRASES.some((phrase) => normalizedText.includes(phrase));
}

/** True when the message opens with a greeting as a whole word. */
function isGreeting(normalizedText: string): boolean {
  return GREETING_KEYWORDS.some(
    (kw) => normalizedText === kw || normalizedText.startsWith(kw + " "),
  );
}

class ConversationService {
  async handleIncomingMessage(context: IncomingMessageContext): Promise<void> {
    console.log("[conversation.service::handleIncomingMessage] ENTER", { from: context.from ? `${context.from.slice(0, 4)}***` : null, messageType: context.messageType, textPreview: context.text?.slice(0, 40) });
    const { from, text, contactName, messageType, interactiveResponse } = context;
    const normalizedText = text.toLowerCase().trim();

    // Ensure taxpayer record exists
    console.log("[conversation.service::handleIncomingMessage] upserting taxpayer record");
    await Taxpayer.findOneAndUpdate(
      { phone: from },
      {
        $setOnInsert: { phone: from, name: contactName },
        $set: { last_interaction: new Date() },
      },
      { upsert: true },
    );

    // Get conversation context
    let convo = await ConversationContext.findOne({ phone: from });
    console.log("[conversation.service::handleIncomingMessage] loaded convo", { hasConvo: !!convo, currentFlow: convo?.current_flow, currentStep: convo?.current_step, awaitingInput: convo?.awaiting_input, isEscalated: convo?.is_escalated });

    // Log interaction
    await auditLogService.log(from, "message_received", {
      text,
      type: messageType,
    });

    // If already escalated, everything the taxpayer sends goes to the officer.
    if (convo?.is_escalated) {
      console.log("[conversation.service::handleIncomingMessage] branch: already escalated, forwarding");
      await escalationService.forwardToAgent(from, text);
      console.log("[conversation.service::handleIncomingMessage] EXIT", { reason: "forwarded-to-agent" });
      return;
    }

    // Interactive replies are handled before any keyword matching. For these,
    // `text` is the reply's internal id (e.g. "by_agent_tin"), not something the
    // taxpayer wrote - matching keywords against an id escalates or resets the
    // conversation on ids that merely happen to contain "agent" or equal "back".
    if (messageType === "interactive" && interactiveResponse) {
      console.log("[conversation.service::handleIncomingMessage] branch: interactive response");
      await this.handleInteractiveResponse(from, interactiveResponse, convo);
      console.log("[conversation.service::handleIncomingMessage] EXIT", { reason: "interactive-handled" });
      return;
    }

    // Everything below this point is free text the taxpayer typed.
    const keywordText = normalizeForKeywords(text);

    // Check for an escalation request
    if (isEscalationRequest(keywordText)) {
      console.log("[conversation.service::handleIncomingMessage] branch: escalation requested");
      await escalationService.escalateToAgent(from, "User requested live agent");
      console.log("[conversation.service::handleIncomingMessage] EXIT", { reason: "escalated" });
      return;
    }

    // Check for menu keywords
    if (MENU_KEYWORDS.some((kw) => keywordText === kw)) {
      console.log("[conversation.service::handleIncomingMessage] branch: menu keyword matched");
      await this.resetAndShowMenu(from, contactName);
      console.log("[conversation.service::handleIncomingMessage] EXIT", { reason: "reset-menu" });
      return;
    }

    // If user is in an active flow and awaiting input, continue flow
    if (convo?.current_flow && convo.awaiting_input) {
      console.log("[conversation.service::handleIncomingMessage] branch: continuing active flow", { flow: convo.current_flow, step: convo.current_step });
      await flowRouter.continueFlow(from, text);
      // Refresh session activity
      if (convo.session_id) {
        console.log("[conversation.service::handleIncomingMessage] refreshing session");
        await sessionService.refreshSession(convo.session_id);
      }
      console.log("[conversation.service::handleIncomingMessage] EXIT", { reason: "flow-continued" });
      return;
    }

    // Check for greetings
    if (isGreeting(keywordText)) {
      console.log("[conversation.service::handleIncomingMessage] branch: greeting detected");
      await this.sendWelcome(from, contactName);
      console.log("[conversation.service::handleIncomingMessage] EXIT", { reason: "greeting-welcomed" });
      return;
    }

    // Classify intent via NLU
    console.log("[conversation.service::handleIncomingMessage] branch: classifying intent via NLU");
    const classification = await akraaAI.classifyIntent(normalizedText, {
      current_flow: convo?.current_flow,
      last_intent: convo?.last_intent,
    });
    console.log("[conversation.service::handleIncomingMessage] classification result", { success: classification.success, confidence: classification.data?.confidence, suggestedFlow: classification.data?.suggested_flow });

    if (
      classification.success &&
      classification.data &&
      classification.data.confidence > 0.7 &&
      classification.data.suggested_flow
    ) {
      console.log("[conversation.service::handleIncomingMessage] branch: high-confidence classification, starting flow");
      // Update context with intent
      await ConversationContext.findOneAndUpdate(
        { phone: from },
        { last_intent: classification.data.intent, last_message_at: new Date() },
        { upsert: true },
      );

      await flowRouter.startFlow(
        from,
        classification.data.suggested_flow as FlowName,
        classification.data.entities,
      );
      console.log("[conversation.service::handleIncomingMessage] EXIT", { reason: "flow-started-from-nlu" });
    } else {
      console.log("[conversation.service::handleIncomingMessage] branch: low-confidence classification, showing welcome");
      // Low confidence or no match - show menu
      await this.sendWelcome(from, contactName);
      console.log("[conversation.service::handleIncomingMessage] EXIT", { reason: "fallback-welcome" });
    }
  }

  async sendWelcome(phone: string, contactName?: string): Promise<void> {
    console.log("[conversation.service::sendWelcome] ENTER", { phone: phone ? `${phone.slice(0, 4)}***` : null, hasContactName: !!contactName });
    const taxpayer = await Taxpayer.findOne({ phone });
    const name = taxpayer?.first_name || contactName;
    console.log("[conversation.service::sendWelcome] resolved name", { hasName: !!name });

    const greeting = name
      ? `Welcome to NRS TaxChat, ${name}!`
      : "Welcome to NRS TaxChat!";

    await whatsappService.sendMessage(
      phone,
      `${greeting}\n\nI'm your AI tax assistant. I can help you with tax services without visiting an office.\n\nSelect a service below, or describe what you need help with.`,
    );

    await menuService.sendMainMenu(phone);
    console.log("[conversation.service::sendWelcome] EXIT");
  }

  async resetAndShowMenu(phone: string, contactName?: string): Promise<void> {
    console.log("[conversation.service::resetAndShowMenu] ENTER", { phone: phone ? `${phone.slice(0, 4)}***` : null });
    // Clear conversation state
    // Mongoose strips `undefined` out of update documents, so these fields must
    // be $unset - assigning undefined leaves the old values in place and the
    // taxpayer stays trapped in the flow they were trying to leave.
    await ConversationContext.findOneAndUpdate(
      { phone },
      {
        $set: { flow_data: {}, last_message_at: new Date() },
        $unset: {
          current_flow: 1,
          current_step: 1,
          awaiting_input: 1,
          pending_auth_flow: 1,
        },
      },
      { upsert: true },
    );
    console.log("[conversation.service::resetAndShowMenu] state cleared");

    await menuService.sendMainMenu(phone);
    console.log("[conversation.service::resetAndShowMenu] EXIT");
  }

  async handleInteractiveResponse(
    phone: string,
    response: Record<string, unknown>,
    convo: InstanceType<typeof ConversationContext> | null,
  ): Promise<void> {
    console.log("[conversation.service::handleInteractiveResponse] ENTER", { phone: phone ? `${phone.slice(0, 4)}***` : null, selectedId: (response as any)?.id, currentFlow: convo?.current_flow });
    // Handle list reply
    const listReply = response as { id?: string; title?: string };
    const selectedId = listReply.id as string | undefined;

    if (!selectedId) {
      console.log("[conversation.service::handleInteractiveResponse] branch: no selectedId");
      await whatsappService.sendMessage(
        phone,
        "I didn't catch that. Please try again or type MENU to see options.",
      );
      console.log("[conversation.service::handleInteractiveResponse] EXIT", { reason: "missing-selectedId" });
      return;
    }

    // Check if selection is a main menu flow
    const isMainMenuOption = MAIN_MENU_OPTIONS.some(
      (opt) => opt.id === selectedId,
    );

    // A main-menu id takes precedence even mid-flow: tapping a service from the
    // main menu is an explicit request to switch to it. This is safe only while
    // no flow emits a reply id equal to a main-menu id - none do today, and any
    // new flow must keep it that way or it will silently restart itself.
    if (isMainMenuOption) {
      console.log("[conversation.service::handleInteractiveResponse] branch: main menu option selected", { selectedId });
      await flowRouter.startFlow(phone, selectedId as FlowName);
      console.log("[conversation.service::handleInteractiveResponse] EXIT", { reason: "flow-started" });
      return;
    }

    // If in an active flow, pass the selection as input
    if (convo?.current_flow) {
      console.log("[conversation.service::handleInteractiveResponse] branch: continuing active flow with selection", { flow: convo.current_flow });
      await flowRouter.continueFlow(phone, selectedId);
      console.log("[conversation.service::handleInteractiveResponse] EXIT", { reason: "flow-continued" });
      return;
    }

    console.log("[conversation.service::handleInteractiveResponse] branch: unknown selection");
    // Unknown selection
    await whatsappService.sendMessage(
      phone,
      "I didn't understand that selection. Type MENU to see available services.",
    );
    console.log("[conversation.service::handleInteractiveResponse] EXIT", { reason: "unknown-selection" });
  }
}

export default new ConversationService();
