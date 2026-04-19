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
    return whatsappService.sendTemplateMessage(phone, "service_request_update", "en", [
      {
        type: "body",
        parameters: [
          { type: "text", text: reference },
          { type: "text", text: status },
          { type: "text", text: nextAction },
        ],
      },
    ]);
  }

  async sendTINIssuedNotification(
    phone: string,
    maskedTIN: string,
  ): Promise<string | null> {
    return whatsappService.sendTemplateMessage(phone, "tin_issued", "en", [
      {
        type: "body",
        parameters: [
          { type: "text", text: maskedTIN },
        ],
      },
    ]);
  }

  async sendTCCReadyNotification(
    phone: string,
    tccReference: string,
    validityPeriod: string,
    verificationUrl: string,
  ): Promise<string | null> {
    return whatsappService.sendTemplateMessage(phone, "tcc_ready", "en", [
      {
        type: "body",
        parameters: [
          { type: "text", text: tccReference },
          { type: "text", text: validityPeriod },
          { type: "text", text: verificationUrl },
        ],
      },
    ]);
  }

  async sendPaymentPostedNotification(
    phone: string,
    amount: string,
    taxType: string,
    period: string,
  ): Promise<string | null> {
    return whatsappService.sendTemplateMessage(phone, "payment_posted", "en", [
      {
        type: "body",
        parameters: [
          { type: "text", text: amount },
          { type: "text", text: taxType },
          { type: "text", text: period },
        ],
      },
    ]);
  }

  async sendFilingDeadlineReminder(
    phone: string,
    taxType: string,
    period: string,
    deadline: string,
  ): Promise<string | null> {
    return whatsappService.sendTemplateMessage(phone, "filing_deadline_reminder", "en", [
      {
        type: "body",
        parameters: [
          { type: "text", text: taxType },
          { type: "text", text: period },
          { type: "text", text: deadline },
        ],
      },
    ]);
  }
}

export default new WhatsAppTemplateService();
