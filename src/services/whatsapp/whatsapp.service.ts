import axios from "axios";
import fs from "fs";
import path from "path";
import { PHONE_NUMBER_ID, WHATSAPP_TOKEN } from "../../config.js";
import type { MenuOption } from "../../types/conversation.types.js";

class WhatsAppService {
  private apiUrl = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

  async sendMessage(to: string, message: string): Promise<void> {
    console.log("[whatsapp.service::sendMessage] ENTER", { to: to ? `${to.slice(0, 4)}***` : null, messageLength: message?.length });
    try {
      await axios.post(
        this.apiUrl,
        {
          messaging_product: "whatsapp",
          to,
          text: { body: message },
        },
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
        },
      );
      console.log("[whatsapp.service::sendMessage] EXIT", { ok: true });
    } catch (err: unknown) {
      console.log("[whatsapp.service::sendMessage] branch: caught error");
      if (axios.isAxiosError(err)) {
        console.error("Send message error:", err.response?.status, err.response?.data);
      } else if (err instanceof Error) {
        console.error(err.message);
      }
      console.log("[whatsapp.service::sendMessage] EXIT", { ok: false });
    }
  }

  async sendInteractiveListMessage(
    to: string,
    headerText: string,
    bodyText: string,
    footerText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>,
  ): Promise<void> {
    console.log("[whatsapp.service::sendInteractiveListMessage] ENTER", { to: to ? `${to.slice(0, 4)}***` : null, headerText, sectionsCount: sections?.length, rowsCount: sections?.reduce((n, s) => n + s.rows.length, 0) });
    try {
      await axios.post(
        this.apiUrl,
        {
          messaging_product: "whatsapp",
          to,
          type: "interactive",
          interactive: {
            type: "list",
            header: { type: "text", text: headerText },
            body: { text: bodyText },
            footer: { text: footerText },
            action: {
              button: "View Options",
              sections,
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
        },
      );
      console.log("[whatsapp.service::sendInteractiveListMessage] EXIT", { ok: true });
    } catch (err: unknown) {
      console.log("[whatsapp.service::sendInteractiveListMessage] branch: caught error");
      if (axios.isAxiosError(err)) {
        console.error("Send list error:", err.response?.status, err.response?.data);
      }
      console.log("[whatsapp.service::sendInteractiveListMessage] EXIT", { ok: false });
    }
  }

  async sendInteractiveButtonMessage(
    to: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>,
  ): Promise<void> {
    console.log("[whatsapp.service::sendInteractiveButtonMessage] ENTER", { to: to ? `${to.slice(0, 4)}***` : null, bodyLength: bodyText?.length, buttonCount: buttons?.length });
    try {
      await axios.post(
        this.apiUrl,
        {
          messaging_product: "whatsapp",
          to,
          type: "interactive",
          interactive: {
            type: "button",
            body: { text: bodyText },
            action: {
              buttons: buttons.slice(0, 3).map((b) => ({
                type: "reply",
                reply: { id: b.id, title: b.title },
              })),
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
        },
      );
      console.log("[whatsapp.service::sendInteractiveButtonMessage] EXIT", { ok: true });
    } catch (err: unknown) {
      console.log("[whatsapp.service::sendInteractiveButtonMessage] branch: caught error");
      if (axios.isAxiosError(err)) {
        console.error("Send button error:", err.response?.status, err.response?.data);
      }
      console.log("[whatsapp.service::sendInteractiveButtonMessage] EXIT", { ok: false });
    }
  }

  async sendMainMenu(to: string, options: MenuOption[]): Promise<void> {
    console.log("[whatsapp.service::sendMainMenu] ENTER", { to: to ? `${to.slice(0, 4)}***` : null, optionsCount: options?.length });
    const rows = options.map((opt) => {
      const row: { id: string; title: string; description?: string } = {
        id: opt.id,
        title: opt.title.slice(0, 24),
      };
      if (opt.description) row.description = opt.description.slice(0, 72);
      return row;
    });

    await this.sendInteractiveListMessage(
      to,
      "NRS TaxChat",
      "What would you like to do today?",
      "Official NRS Virtual Tax Office",
      [{ title: "Tax Services", rows }],
    );
    console.log("[whatsapp.service::sendMainMenu] EXIT", { rows: rows.length });
  }

  async sendFlowMessage(
    recipientPhone: string,
    flowToken: string,
    flowId: string,
    body: string,
    flowCta?: string,
    screen?: string,
  ): Promise<void> {
    console.log("[whatsapp.service::sendFlowMessage] ENTER", { to: recipientPhone ? `${recipientPhone.slice(0, 4)}***` : null, flowId, hasFlowToken: !!flowToken, screen, flowCta });
    try {
      const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;

      const data: Record<string, unknown> = {
        messaging_product: "whatsapp",
        to: recipientPhone,
        recipient_type: "individual",
        type: "interactive",
        interactive: {
          type: "flow",
          header: { type: "text", text: "NRS TaxChat\n\u200E" },
          body: { text: body },
          footer: { text: "Official NRS Virtual Tax Office" },
          action: {
            name: "flow",
            parameters: {
              flow_message_version: "3",
              flow_action: "navigate",
              flow_token: flowToken,
              flow_id: flowId,
              flow_cta: flowCta,
              flow_action_payload: {
                screen,
                data: {},
              },
            },
          },
        },
      };

      await axios.post(url, data, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        },
      });
      console.log("[whatsapp.service::sendFlowMessage] EXIT", { ok: true });
    } catch (err: unknown) {
      console.log("[whatsapp.service::sendFlowMessage] branch: caught error");
      if (axios.isAxiosError(err)) {
        console.error("Send flow error:", err.response?.status, err.response?.data);
      }
      console.log("[whatsapp.service::sendFlowMessage] EXIT", { ok: false, rethrow: true });
      throw err;
    }
  }

  async sendInitFlowMessage(
    recipientPhone: string,
    flowToken: string,
    flowId: string,
    body: string,
    flowCta?: string,
    _screen?: string,
  ): Promise<void> {
    console.log("[whatsapp.service::sendInitFlowMessage] ENTER", { to: recipientPhone ? `${recipientPhone.slice(0, 4)}***` : null, flowId, hasFlowToken: !!flowToken, flowCta });
    try {
      const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;

      const data: Record<string, unknown> = {
        messaging_product: "whatsapp",
        to: recipientPhone,
        recipient_type: "individual",
        type: "interactive",
        interactive: {
          type: "flow",
          header: { type: "text", text: "NRS TaxChat\n\u200E" },
          body: { text: body },
          footer: { text: "Official NRS Virtual Tax Office" },
          action: {
            name: "flow",
            parameters: {
              flow_message_version: "3",
              flow_action: "data_exchange",
              flow_token: flowToken,
              flow_id: flowId,
              flow_cta: flowCta,
            },
          },
        },
      };

      await axios.post(url, data, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        },
      });
      console.log("[whatsapp.service::sendInitFlowMessage] EXIT", { ok: true });
    } catch (err: unknown) {
      console.log("[whatsapp.service::sendInitFlowMessage] branch: caught error");
      if (axios.isAxiosError(err)) {
        console.error("Send init flow error:", err.response?.status, err.response?.data);
      }
      console.log("[whatsapp.service::sendInitFlowMessage] EXIT", { ok: false, rethrow: true });
      throw err;
    }
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string,
    components: Array<{
      type: string;
      parameters: Array<{ type: string; text?: string }>;
    }>,
  ): Promise<string | null> {
    console.log("[whatsapp.service::sendTemplateMessage] ENTER", { to: to ? `${to.slice(0, 4)}***` : null, templateName, languageCode, componentsCount: components?.length });
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: templateName,
            language: { code: languageCode },
            components,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
        },
      );
      const msgId = response.data?.messages?.[0]?.id ?? null;
      console.log("[whatsapp.service::sendTemplateMessage] EXIT", { ok: true, hasMessageId: !!msgId });
      return msgId;
    } catch (err: unknown) {
      console.log("[whatsapp.service::sendTemplateMessage] branch: caught error");
      if (axios.isAxiosError(err)) {
        console.error("Send template error:", err.response?.status, err.response?.data);
      }
      console.log("[whatsapp.service::sendTemplateMessage] EXIT", { ok: false });
      return null;
    }
  }

  async sendImage(to: string, mediaId: string, caption?: string): Promise<void> {
    console.log("[whatsapp.service::sendImage] ENTER", { to: to ? `${to.slice(0, 4)}***` : null, hasMediaId: !!mediaId, hasCaption: !!caption });
    try {
      await axios.post(
        this.apiUrl,
        {
          messaging_product: "whatsapp",
          to,
          type: "image",
          image: { id: mediaId, caption },
        },
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
        },
      );
      console.log("[whatsapp.service::sendImage] EXIT", { ok: true });
    } catch (err: unknown) {
      console.log("[whatsapp.service::sendImage] branch: caught error");
      if (axios.isAxiosError(err)) {
        console.error("Send image error:", err.response?.status, err.response?.data);
      }
      console.log("[whatsapp.service::sendImage] EXIT", { ok: false, rethrow: true });
      throw err;
    }
  }

  async uploadMedia(
    filePath: string,
    fileType: string = "application/pdf",
  ): Promise<string> {
    console.log("[whatsapp.service::uploadMedia] ENTER", { filePath, fileType });
    const url = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/media`;
    const form = new FormData();
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: fileType });
    form.append("file", blob, path.basename(filePath));
    form.append("messaging_product", "whatsapp");
    form.append("type", fileType);
    console.log("[whatsapp.service::uploadMedia] uploading", { sizeBytes: fileBuffer.length });

    try {
      const response = await axios.post(url, form, {
        headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
      });
      console.log("[whatsapp.service::uploadMedia] EXIT", { ok: true, hasId: !!response.data?.id });
      return response.data.id;
    } catch (err: unknown) {
      console.log("[whatsapp.service::uploadMedia] branch: caught error");
      if (axios.isAxiosError(err)) {
        console.error("Media upload error:", err.response?.status, err.response?.data);
      }
      console.log("[whatsapp.service::uploadMedia] EXIT", { ok: false, rethrow: true });
      throw err;
    }
  }

  async sendDocument(
    to: string,
    mediaId: string,
    fileName: string,
    caption?: string,
  ): Promise<void> {
    console.log("[whatsapp.service::sendDocument] ENTER", { to: to ? `${to.slice(0, 4)}***` : null, fileName, hasMediaId: !!mediaId, hasCaption: !!caption });
    try {
      await axios.post(
        this.apiUrl,
        {
          messaging_product: "whatsapp",
          to,
          type: "document",
          document: { id: mediaId, filename: fileName, caption },
        },
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
        },
      );
      console.log("[whatsapp.service::sendDocument] EXIT", { ok: true });
    } catch (err: unknown) {
      console.log("[whatsapp.service::sendDocument] branch: caught error");
      if (axios.isAxiosError(err)) {
        console.error("Send document error:", err.response?.status, err.response?.data);
      }
      console.log("[whatsapp.service::sendDocument] EXIT", { ok: false, rethrow: true });
      throw err;
    }
  }

  async markAsRead(messageId: string): Promise<void> {
    console.log("[whatsapp.service::markAsRead] ENTER", { hasMessageId: !!messageId });
    try {
      await axios.post(
        this.apiUrl,
        {
          messaging_product: "whatsapp",
          status: "read",
          message_id: messageId,
        },
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
        },
      );
      console.log("[whatsapp.service::markAsRead] EXIT", { ok: true });
    } catch (err: unknown) {
      console.log("[whatsapp.service::markAsRead] branch: caught error (best-effort)");
      // Read receipts are best-effort
      console.log("[whatsapp.service::markAsRead] EXIT", { ok: false });
    }
  }
}

export default new WhatsAppService();
