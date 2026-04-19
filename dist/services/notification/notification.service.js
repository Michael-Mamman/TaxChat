import Notification, { NotificationType } from "../../models/notification.model.js";
import Taxpayer from "../../models/taxpayer.model.js";
import whatsappService from "../whatsapp/whatsapp.service.js";
import auditLogService from "../auditLog.service.js";
class NotificationService {
    async sendTemplateNotification(phone, type, templateName, templateParams) {
        // Check opt-in for non-transactional notifications
        const taxpayer = await Taxpayer.findOne({ phone });
        if (taxpayer && !taxpayer.opted_in_notifications) {
            const transactional = [
                NotificationType.SERVICE_UPDATE,
                NotificationType.TIN_ISSUED,
                NotificationType.TCC_READY,
                NotificationType.PAYMENT_POSTED,
            ];
            if (!transactional.includes(type)) {
                console.log(`[Notification] Skipping ${type} for ${phone} (opted out)`);
                return;
            }
        }
        // Create notification record
        const notification = await Notification.create({
            phone,
            type,
            template_name: templateName,
            template_params: templateParams,
            status: "pending",
        });
        // Send via WhatsApp template
        const components = [
            {
                type: "body",
                parameters: Object.values(templateParams).map((v) => ({
                    type: "text",
                    text: v,
                })),
            },
        ];
        const messageId = await whatsappService.sendTemplateMessage(phone, templateName, "en", components);
        // Update notification status
        notification.status = messageId ? "sent" : "failed";
        if (messageId) {
            notification.whatsapp_message_id = messageId;
            notification.sent_at = new Date();
        }
        else {
            notification.error_message = "Failed to send template message";
        }
        await notification.save();
        await auditLogService.log(phone, "notification_sent", {
            type,
            template: templateName,
            status: notification.status,
        });
    }
    async scheduleNotification(phone, type, templateName, templateParams, scheduledAt) {
        await Notification.create({
            phone,
            type,
            template_name: templateName,
            template_params: templateParams,
            status: "pending",
            scheduled_at: scheduledAt,
        });
    }
    async processScheduledNotifications() {
        const pending = await Notification.find({
            status: "pending",
            scheduled_at: { $lte: new Date() },
        }).limit(100);
        let sent = 0;
        for (const notification of pending) {
            try {
                const messageId = await whatsappService.sendTemplateMessage(notification.phone, notification.template_name, "en", [
                    {
                        type: "body",
                        parameters: Object.values(notification.template_params).map((v) => ({ type: "text", text: v })),
                    },
                ]);
                notification.status = messageId ? "sent" : "failed";
                if (messageId)
                    notification.whatsapp_message_id = messageId;
                notification.sent_at = new Date();
                await notification.save();
                sent++;
            }
            catch (err) {
                notification.status = "failed";
                notification.error_message = err instanceof Error ? err.message : "Unknown error";
                await notification.save();
            }
        }
        return sent;
    }
    async updateDeliveryStatus(whatsappMessageId, status) {
        const statusMap = {
            sent: "sent",
            delivered: "delivered",
            read: "read",
            failed: "failed",
        };
        const mappedStatus = statusMap[status];
        if (!mappedStatus)
            return;
        await Notification.findOneAndUpdate({ whatsapp_message_id: whatsappMessageId }, {
            status: mappedStatus,
            delivery_status_updated_at: new Date(),
        });
    }
}
export default new NotificationService();
