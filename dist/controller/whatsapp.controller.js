import conversationService from "../services/conversation/conversation.service.js";
import whatsappService from "../services/whatsapp/whatsapp.service.js";
import { PHONE_NUMBER_ID } from "../config.js";
export const handleVerify = (req, res) => {
    console.log("[whatsapp.controller::handleVerify] ENTER", { mode: req.query["hub.mode"], hasToken: !!req.query["hub.verify_token"], hasChallenge: !!req.query["hub.challenge"] });
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
        console.log("[whatsapp.controller::handleVerify] branch: verification matched");
        console.log("Webhook verified successfully");
        console.log("[whatsapp.controller::handleVerify] EXIT", { status: 200 });
        return res.status(200).send(challenge);
    }
    console.log("[whatsapp.controller::handleVerify] branch: verification failed");
    console.log("[whatsapp.controller::handleVerify] EXIT", { status: 403 });
    return res.sendStatus(403);
};
/**
 * Maps a Meta webhook payload to the internal message context.
 *
 * Extracted from the request handler so the conversation engine can be driven
 * from tests with real webhook payloads - this mapping is where an interactive
 * reply's *id* becomes the message text, which is precisely the behaviour the
 * conversation router has to account for.
 *
 * Returns null when the payload carries nothing actionable (wrong number,
 * status callbacks, no sender).
 */
export function parseWebhookMessage(body) {
    const b = body;
    const value = b?.entry?.[0]?.changes?.[0]?.value;
    const recipientId = value?.metadata?.phone_number_id;
    if (recipientId && recipientId !== PHONE_NUMBER_ID) {
        console.log("[whatsapp.controller::parseWebhookMessage] branch: recipientId mismatch", { recipientId });
        return null;
    }
    const messages = value?.messages;
    if (!messages || messages.length === 0) {
        console.log("[whatsapp.controller::parseWebhookMessage] branch: no messages in payload");
        return null;
    }
    const message = messages[0];
    const from = message?.from;
    if (!from) {
        console.log("[whatsapp.controller::parseWebhookMessage] branch: missing from");
        return null;
    }
    const contactName = value?.contacts?.[0]?.profile?.name;
    console.log("[whatsapp.controller::parseWebhookMessage] parsed message", { from: `${from.slice(0, 4)}***`, messageType: message.type, hasContactName: !!contactName });
    const context = {
        from,
        text: "",
        contactName,
        messageType: message.type || "text",
    };
    if (message.type === "interactive") {
        const interactive = message.interactive;
        if (interactive?.list_reply) {
            console.log("[whatsapp.controller::parseWebhookMessage] branch: list_reply");
            context.text = interactive.list_reply.id;
            context.interactiveResponse = interactive.list_reply;
        }
        else if (interactive?.button_reply) {
            console.log("[whatsapp.controller::parseWebhookMessage] branch: button_reply");
            context.text = interactive.button_reply.id;
            context.interactiveResponse = interactive.button_reply;
        }
        else if (interactive?.nfm_reply) {
            console.log("[whatsapp.controller::parseWebhookMessage] branch: nfm_reply (flow response)");
            const responseJson = JSON.parse(interactive.nfm_reply.response_json);
            context.text = JSON.stringify(responseJson);
            context.interactiveResponse = responseJson;
        }
    }
    else if (message.type === "text") {
        console.log("[whatsapp.controller::parseWebhookMessage] branch: text message", { textLength: (message.text?.body || "").length });
        context.text = message.text?.body || "";
    }
    else if (message.type === "image" || message.type === "document") {
        console.log("[whatsapp.controller::parseWebhookMessage] branch: media message", { type: message.type });
        context.text = `media:${message[message.type]?.id || ""}`;
        context.mediaId = message[message.type]?.id;
    }
    return message.id ? { context, messageId: message.id } : { context };
}
export const handleIncomingMessage = async (req, res) => {
    console.log("[whatsapp.controller::handleIncomingMessage] ENTER", { hasBody: !!req.body, hasEntry: !!req.body?.entry });
    try {
        const parsed = parseWebhookMessage(req.body);
        if (!parsed) {
            console.log("[whatsapp.controller::handleIncomingMessage] EXIT", { status: 200, reason: "nothing-actionable" });
            return res.sendStatus(200);
        }
        if (parsed.messageId) {
            console.log("[whatsapp.controller::handleIncomingMessage] branch: marking message as read");
            await whatsappService.markAsRead(parsed.messageId);
        }
        console.log("[whatsapp.controller::handleIncomingMessage] dispatching to conversationService", { messageType: parsed.context.messageType, textPreview: parsed.context.text.slice(0, 40) });
        await conversationService.handleIncomingMessage(parsed.context);
        console.log("[whatsapp.controller::handleIncomingMessage] EXIT", { status: 200, reason: "handled" });
        return res.sendStatus(200);
    }
    catch (err) {
        console.log("[whatsapp.controller::handleIncomingMessage] branch: caught error");
        if (err instanceof Error) {
            console.error("Webhook Error:", err.message);
        }
        console.log("[whatsapp.controller::handleIncomingMessage] EXIT", { status: 200, reason: "error-swallowed" });
        return res.sendStatus(200);
    }
};
