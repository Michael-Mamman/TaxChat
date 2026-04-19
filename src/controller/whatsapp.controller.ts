import type { Request, Response } from "express";
import conversationService from "../services/conversation/conversation.service.js";
import whatsappService from "../services/whatsapp/whatsapp.service.js";
import { PHONE_NUMBER_ID } from "../config.js";
import type { IncomingMessageContext } from "../types/conversation.types.js";

export const handleVerify = (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    console.log("Webhook verified successfully");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
};

export const handleIncomingMessage = async (req: Request, res: Response) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const metadata = value?.metadata;
    const recipientId = metadata?.phone_number_id;

    if (recipientId && recipientId !== PHONE_NUMBER_ID) {
      return res.sendStatus(200);
    }

    const messages = value?.messages;
    if (!messages || messages.length === 0) {
      return res.sendStatus(200);
    }

    const message = messages[0];
    const from = message?.from;
    const contactName = value?.contacts?.[0]?.profile?.name;

    if (!from) {
      return res.sendStatus(200);
    }

    // Mark as read
    if (message.id) {
      await whatsappService.markAsRead(message.id);
    }

    // Build context for ConversationService
    const msgContext: IncomingMessageContext = {
      from,
      text: "",
      contactName,
      messageType: message.type || "text",
    };

    if (message.type === "interactive") {
      const interactive = message.interactive;
      if (interactive?.list_reply) {
        msgContext.text = interactive.list_reply.id;
        msgContext.interactiveResponse = interactive.list_reply;
      } else if (interactive?.button_reply) {
        msgContext.text = interactive.button_reply.id;
        msgContext.interactiveResponse = interactive.button_reply;
      } else if (interactive?.nfm_reply) {
        const responseJson = JSON.parse(interactive.nfm_reply.response_json);
        msgContext.text = JSON.stringify(responseJson);
        msgContext.interactiveResponse = responseJson;
      }
    } else if (message.type === "text") {
      msgContext.text = message.text?.body || "";
    } else if (message.type === "image" || message.type === "document") {
      msgContext.text = `media:${message[message.type]?.id || ""}`;
      msgContext.mediaId = message[message.type]?.id;
    }

    await conversationService.handleIncomingMessage(msgContext);
    return res.sendStatus(200);
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Webhook Error:", err.message);
    }
    return res.sendStatus(200);
  }
};
