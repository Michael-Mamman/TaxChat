import ConversationContext from "../../models/conversationContext.model.js";
import Taxpayer from "../../models/taxpayer.model.js";
import akraaAI from "../integrations/akraa-ai.service.js";
import authService from "../auth/auth.service.js";
import sessionService from "../auth/session.service.js";
import flowRouter from "../flows/flowRouter.service.js";
import menuService from "./menu.service.js";
import whatsappService from "../whatsapp/whatsapp.service.js";
import escalationService from "../escalation/escalation.service.js";
import auditLogService from "../auditLog.service.js";
import { ESCALATION_KEYWORDS, MENU_KEYWORDS, GREETING_KEYWORDS, MAIN_MENU_OPTIONS, } from "../../utils/constants.js";
class ConversationService {
    async handleIncomingMessage(context) {
        const { from, text, contactName, messageType, interactiveResponse } = context;
        const normalizedText = text.toLowerCase().trim();
        // Ensure taxpayer record exists
        await Taxpayer.findOneAndUpdate({ phone: from }, {
            $setOnInsert: { phone: from, name: contactName },
            $set: { last_interaction: new Date() },
        }, { upsert: true });
        // Get conversation context
        let convo = await ConversationContext.findOne({ phone: from });
        // Log interaction
        await auditLogService.log(from, "message_received", {
            text,
            type: messageType,
        });
        // Check for escalation keywords
        if (ESCALATION_KEYWORDS.some((kw) => normalizedText.includes(kw))) {
            await escalationService.escalateToAgent(from, "User requested live agent");
            return;
        }
        // If escalated, forward to agent
        if (convo?.is_escalated) {
            await escalationService.forwardToAgent(from, text);
            return;
        }
        // Check for menu keywords
        if (MENU_KEYWORDS.some((kw) => normalizedText === kw)) {
            await this.resetAndShowMenu(from, contactName);
            return;
        }
        // Handle interactive responses (list/button selections)
        if (messageType === "interactive" && interactiveResponse) {
            await this.handleInteractiveResponse(from, interactiveResponse, convo);
            return;
        }
        // If user is in an active flow and awaiting input, continue flow
        if (convo?.current_flow && convo.awaiting_input) {
            await flowRouter.continueFlow(from, text);
            // Refresh session activity
            if (convo.session_id) {
                await sessionService.refreshSession(convo.session_id);
            }
            return;
        }
        // Check for greetings
        if (GREETING_KEYWORDS.some((kw) => normalizedText.startsWith(kw))) {
            await this.sendWelcome(from, contactName);
            return;
        }
        // Classify intent via NLU
        const classification = await akraaAI.classifyIntent(normalizedText, {
            current_flow: convo?.current_flow,
            last_intent: convo?.last_intent,
        });
        if (classification.success &&
            classification.data &&
            classification.data.confidence > 0.7 &&
            classification.data.suggested_flow) {
            // Update context with intent
            await ConversationContext.findOneAndUpdate({ phone: from }, { last_intent: classification.data.intent, last_message_at: new Date() }, { upsert: true });
            await flowRouter.startFlow(from, classification.data.suggested_flow, classification.data.entities);
        }
        else {
            // Low confidence or no match - show menu
            await this.sendWelcome(from, contactName);
        }
    }
    async sendWelcome(phone, contactName) {
        const taxpayer = await Taxpayer.findOne({ phone });
        const name = taxpayer?.first_name || contactName;
        const greeting = name
            ? `Welcome to NRS TaxChat, ${name}!`
            : "Welcome to NRS TaxChat!";
        await whatsappService.sendMessage(phone, `${greeting}\n\nI'm your AI tax assistant. I can help you with tax services without visiting an office.\n\nSelect a service below, or describe what you need help with.`);
        await menuService.sendMainMenu(phone);
    }
    async resetAndShowMenu(phone, contactName) {
        // Clear conversation state
        await ConversationContext.findOneAndUpdate({ phone }, {
            current_flow: undefined,
            current_step: undefined,
            flow_data: {},
            awaiting_input: undefined,
            pending_auth_flow: undefined,
        }, { upsert: true });
        await menuService.sendMainMenu(phone);
    }
    async handleInteractiveResponse(phone, response, convo) {
        // Handle list reply
        const listReply = response;
        const selectedId = listReply.id;
        if (!selectedId) {
            await whatsappService.sendMessage(phone, "I didn't catch that. Please try again or type MENU to see options.");
            return;
        }
        // Check if selection is a main menu flow
        const isMainMenuOption = MAIN_MENU_OPTIONS.some((opt) => opt.id === selectedId);
        if (isMainMenuOption) {
            await flowRouter.startFlow(phone, selectedId);
            return;
        }
        // If in an active flow, pass the selection as input
        if (convo?.current_flow) {
            await flowRouter.continueFlow(phone, selectedId);
            return;
        }
        // Unknown selection
        await whatsappService.sendMessage(phone, "I didn't understand that selection. Type MENU to see available services.");
    }
}
export default new ConversationService();
