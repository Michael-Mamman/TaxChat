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
export const handleIncomingMessage = async (req, res) => {
    console.log("[whatsapp.controller::handleIncomingMessage] ENTER", { hasBody: !!req.body, hasEntry: !!req.body?.entry });
    try {
        const entry = req.body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const metadata = value?.metadata;
        const recipientId = metadata?.phone_number_id;
        if (recipientId && recipientId !== PHONE_NUMBER_ID) {
            console.log("[whatsapp.controller::handleIncomingMessage] branch: recipientId mismatch", { recipientId });
            console.log("[whatsapp.controller::handleIncomingMessage] EXIT", { status: 200, reason: "not-our-number" });
            return res.sendStatus(200);
        }
        const messages = value?.messages;
        if (!messages || messages.length === 0) {
            console.log("[whatsapp.controller::handleIncomingMessage] branch: no messages in payload");
            console.log("[whatsapp.controller::handleIncomingMessage] EXIT", { status: 200, reason: "no-messages" });
            return res.sendStatus(200);
        }
        const message = messages[0];
        const from = message?.from;
        const contactName = value?.contacts?.[0]?.profile?.name;
        if (!from) {
            console.log("[whatsapp.controller::handleIncomingMessage] branch: missing from");
            console.log("[whatsapp.controller::handleIncomingMessage] EXIT", { status: 200, reason: "no-from" });
            return res.sendStatus(200);
        }
        console.log("[whatsapp.controller::handleIncomingMessage] parsed message", { from: from ? `${from.slice(0, 4)}***` : null, messageType: message.type, hasContactName: !!contactName });
        // Mark as read
        if (message.id) {
            console.log("[whatsapp.controller::handleIncomingMessage] branch: marking message as read");
            await whatsappService.markAsRead(message.id);
        }
        // Build context for ConversationService
        const msgContext = {
            from,
            text: "",
            contactName,
            messageType: message.type || "text",
        };
        if (message.type === "interactive") {
            console.log("[whatsapp.controller::handleIncomingMessage] branch: interactive message");
            const interactive = message.interactive;
            if (interactive?.list_reply) {
                console.log("[whatsapp.controller::handleIncomingMessage] branch: list_reply");
                msgContext.text = interactive.list_reply.id;
                msgContext.interactiveResponse = interactive.list_reply;
            }
            else if (interactive?.button_reply) {
                console.log("[whatsapp.controller::handleIncomingMessage] branch: button_reply");
                msgContext.text = interactive.button_reply.id;
                msgContext.interactiveResponse = interactive.button_reply;
            }
            else if (interactive?.nfm_reply) {
                console.log("[whatsapp.controller::handleIncomingMessage] branch: nfm_reply (flow response)");
                const responseJson = JSON.parse(interactive.nfm_reply.response_json);
                msgContext.text = JSON.stringify(responseJson);
                msgContext.interactiveResponse = responseJson;
            }
        }
        else if (message.type === "text") {
            console.log("[whatsapp.controller::handleIncomingMessage] branch: text message", { textLength: (message.text?.body || "").length });
            msgContext.text = message.text?.body || "";
        }
        else if (message.type === "image" || message.type === "document") {
            console.log("[whatsapp.controller::handleIncomingMessage] branch: media message", { type: message.type, hasMediaId: !!message[message.type]?.id });
            msgContext.text = `media:${message[message.type]?.id || ""}`;
            msgContext.mediaId = message[message.type]?.id;
        }
        console.log("[whatsapp.controller::handleIncomingMessage] dispatching to conversationService", { messageType: msgContext.messageType, textPreview: msgContext.text.slice(0, 40) });
        await conversationService.handleIncomingMessage(msgContext);
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
