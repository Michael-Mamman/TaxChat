import AuditLog from "../models/auditLog.model.js";
class AuditLogService {
    async log(phone, action, details, channel = "whatsapp") {
        console.log('[auditLog.service::log] ENTER', { phone, action, channel, detailsKeys: Object.keys(details || {}) });
        try {
            console.log('[auditLog.service::log] branch: try create');
            await AuditLog.create({
                phone,
                action,
                channel,
                details,
                timestamp: new Date(),
            });
            console.log('[auditLog.service::log] EXIT', { status: 'created' });
        }
        catch (err) {
            console.log('[auditLog.service::log] branch: catch error');
            console.error("[AuditLog] Failed to log:", err);
            console.log('[auditLog.service::log] EXIT', { status: 'error' });
        }
    }
    async getHistory(phone, limit = 50) {
        console.log('[auditLog.service::getHistory] ENTER', { phone, limit });
        const result = AuditLog.find({ phone })
            .sort({ timestamp: -1 })
            .limit(limit);
        console.log('[auditLog.service::getHistory] EXIT', { phone, limit });
        return result;
    }
}
export default new AuditLogService();
