import axios from "axios";
import fs from "fs";
import path from "path";
import { PHONE_NUMBER_ID, WHATSAPP_TOKEN } from "../../config.js";
class WhatsAppService {
    apiUrl = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;
    async sendMessage(to, message) {
        try {
            await axios.post(this.apiUrl, {
                messaging_product: "whatsapp",
                to,
                text: { body: message },
            }, {
                headers: {
                    Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                    "Content-Type": "application/json",
                },
            });
        }
        catch (err) {
            if (axios.isAxiosError(err)) {
                console.error("Send message error:", err.response?.status, err.response?.data);
            }
            else if (err instanceof Error) {
                console.error(err.message);
            }
        }
    }
    async sendInteractiveListMessage(to, headerText, bodyText, footerText, sections) {
        try {
            await axios.post(this.apiUrl, {
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
            }, {
                headers: {
                    Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                    "Content-Type": "application/json",
                },
            });
        }
        catch (err) {
            if (axios.isAxiosError(err)) {
                console.error("Send list error:", err.response?.status, err.response?.data);
            }
        }
    }
    async sendInteractiveButtonMessage(to, bodyText, buttons) {
        try {
            await axios.post(this.apiUrl, {
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
            }, {
                headers: {
                    Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                    "Content-Type": "application/json",
                },
            });
        }
        catch (err) {
            if (axios.isAxiosError(err)) {
                console.error("Send button error:", err.response?.status, err.response?.data);
            }
        }
    }
    async sendMainMenu(to, options) {
        const rows = options.map((opt) => {
            const row = {
                id: opt.id,
                title: opt.title.slice(0, 24),
            };
            if (opt.description)
                row.description = opt.description.slice(0, 72);
            return row;
        });
        await this.sendInteractiveListMessage(to, "NRS TaxChat", "What would you like to do today?", "Official NRS Virtual Tax Office", [{ title: "Tax Services", rows }]);
    }
    async sendFlowMessage(recipientPhone, flowToken, flowId, body, flowCta, screen) {
        try {
            const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;
            const data = {
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
        }
        catch (err) {
            if (axios.isAxiosError(err)) {
                console.error("Send flow error:", err.response?.status, err.response?.data);
            }
            throw err;
        }
    }
    async sendInitFlowMessage(recipientPhone, flowToken, flowId, body, flowCta, _screen) {
        try {
            const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;
            const data = {
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
        }
        catch (err) {
            if (axios.isAxiosError(err)) {
                console.error("Send init flow error:", err.response?.status, err.response?.data);
            }
            throw err;
        }
    }
    async sendTemplateMessage(to, templateName, languageCode, components) {
        try {
            const response = await axios.post(this.apiUrl, {
                messaging_product: "whatsapp",
                to,
                type: "template",
                template: {
                    name: templateName,
                    language: { code: languageCode },
                    components,
                },
            }, {
                headers: {
                    Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                    "Content-Type": "application/json",
                },
            });
            return response.data?.messages?.[0]?.id ?? null;
        }
        catch (err) {
            if (axios.isAxiosError(err)) {
                console.error("Send template error:", err.response?.status, err.response?.data);
            }
            return null;
        }
    }
    async sendImage(to, mediaId, caption) {
        try {
            await axios.post(this.apiUrl, {
                messaging_product: "whatsapp",
                to,
                type: "image",
                image: { id: mediaId, caption },
            }, {
                headers: {
                    Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                    "Content-Type": "application/json",
                },
            });
        }
        catch (err) {
            if (axios.isAxiosError(err)) {
                console.error("Send image error:", err.response?.status, err.response?.data);
            }
            throw err;
        }
    }
    async uploadMedia(filePath, fileType = "application/pdf") {
        const url = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/media`;
        const form = new FormData();
        const fileBuffer = fs.readFileSync(filePath);
        const blob = new Blob([fileBuffer], { type: fileType });
        form.append("file", blob, path.basename(filePath));
        form.append("messaging_product", "whatsapp");
        form.append("type", fileType);
        try {
            const response = await axios.post(url, form, {
                headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
            });
            return response.data.id;
        }
        catch (err) {
            if (axios.isAxiosError(err)) {
                console.error("Media upload error:", err.response?.status, err.response?.data);
            }
            throw err;
        }
    }
    async sendDocument(to, mediaId, fileName, caption) {
        try {
            await axios.post(this.apiUrl, {
                messaging_product: "whatsapp",
                to,
                type: "document",
                document: { id: mediaId, filename: fileName, caption },
            }, {
                headers: {
                    Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                    "Content-Type": "application/json",
                },
            });
        }
        catch (err) {
            if (axios.isAxiosError(err)) {
                console.error("Send document error:", err.response?.status, err.response?.data);
            }
            throw err;
        }
    }
    async markAsRead(messageId) {
        try {
            await axios.post(this.apiUrl, {
                messaging_product: "whatsapp",
                status: "read",
                message_id: messageId,
            }, {
                headers: {
                    Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                    "Content-Type": "application/json",
                },
            });
        }
        catch (err) {
            // Read receipts are best-effort
        }
    }
}
export default new WhatsAppService();
