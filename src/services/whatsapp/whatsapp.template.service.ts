import whatsappService from "./whatsapp.service.js";

/**
 * Higher-level template message helpers for common TaxChat notifications.
 * These wrap the core WhatsApp service sendTemplateMessage method.
 */
class WhatsAppTemplateService {
  async sendServiceRequestUpdate(
    phone: string,
    reference: string,
    status: string,
    nextAction: string,
  ): Promise<string | null> {
    console.log("[whatsapp.template.service::sendServiceRequestUpdate] ENTER", { phone: phone ? `${phone.slice(0, 4)}***` : null, reference, status });
    const result = await whatsappService.sendTemplateMessage(phone, "service_request_update", "en", [
      {
        type: "body",
        parameters: [
          { type: "text", text: reference },
          { type: "text", text: status },
          { type: "text", text: nextAction },
        ],
      },
    ]);
    console.log("[whatsapp.template.service::sendServiceRequestUpdate] EXIT", { hasMessageId: !!result });
    return result;
  }

  async sendTINIssuedNotification(
    phone: string,
    maskedTIN: string,
  ): Promise<string | null> {
    console.log("[whatsapp.template.service::sendTINIssuedNotification] ENTER", { phone: phone ? `${phone.slice(0, 4)}***` : null, hasTIN: !!maskedTIN });
    const result = await whatsappService.sendTemplateMessage(phone, "tin_issued", "en", [
      {
        type: "body",
        parameters: [
          { type: "text", text: maskedTIN },
        ],
      },
    ]);
    console.log("[whatsapp.template.service::sendTINIssuedNotification] EXIT", { hasMessageId: !!result });
    return result;
  }

  async sendTCCReadyNotification(
    phone: string,
    tccReference: string,
    validityPeriod: string,
    verificationUrl: string,
  ): Promise<string | null> {
    console.log("[whatsapp.template.service::sendTCCReadyNotification] ENTER", { phone: phone ? `${phone.slice(0, 4)}***` : null, tccReference, validityPeriod });
    const result = await whatsappService.sendTemplateMessage(phone, "tcc_ready", "en", [
      {
        type: "body",
        parameters: [
          { type: "text", text: tccReference },
          { type: "text", text: validityPeriod },
          { type: "text", text: verificationUrl },
        ],
      },
    ]);
    console.log("[whatsapp.template.service::sendTCCReadyNotification] EXIT", { hasMessageId: !!result });
    return result;
  }

  async sendPaymentPostedNotification(
    phone: string,
    amount: string,
    taxType: string,
    period: string,
  ): Promise<string | null> {
    console.log("[whatsapp.template.service::sendPaymentPostedNotification] ENTER", { phone: phone ? `${phone.slice(0, 4)}***` : null, amount, taxType, period });
    const result = await whatsappService.sendTemplateMessage(phone, "payment_posted", "en", [
      {
        type: "body",
        parameters: [
          { type: "text", text: amount },
          { type: "text", text: taxType },
          { type: "text", text: period },
        ],
      },
    ]);
    console.log("[whatsapp.template.service::sendPaymentPostedNotification] EXIT", { hasMessageId: !!result });
    return result;
  }

  async sendFilingDeadlineReminder(
    phone: string,
    taxType: string,
    period: string,
    deadline: string,
  ): Promise<string | null> {
    console.log("[whatsapp.template.service::sendFilingDeadlineReminder] ENTER", { phone: phone ? `${phone.slice(0, 4)}***` : null, taxType, period, deadline });
    const result = await whatsappService.sendTemplateMessage(phone, "filing_deadline_reminder", "en", [
      {
        type: "body",
        parameters: [
          { type: "text", text: taxType },
          { type: "text", text: period },
          { type: "text", text: deadline },
        ],
      },
    ]);
    console.log("[whatsapp.template.service::sendFilingDeadlineReminder] EXIT", { hasMessageId: !!result });
    return result;
  }
}

export default new WhatsAppTemplateService();
