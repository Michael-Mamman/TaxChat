import AuditLog from "../models/auditLog.model.js";

class AuditLogService {
  async log(
    phone: string,
    action: string,
    details: Record<string, unknown>,
    channel: "whatsapp" | "system" | "api" = "whatsapp",
  ): Promise<void> {
    try {
      await AuditLog.create({
        phone,
        action,
        channel,
        details,
        timestamp: new Date(),
      });
    } catch (err) {
      console.error("[AuditLog] Failed to log:", err);
    }
  }

  async getHistory(phone: string, limit: number = 50) {
    return AuditLog.find({ phone })
      .sort({ timestamp: -1 })
      .limit(limit);
  }
}

export default new AuditLogService();
