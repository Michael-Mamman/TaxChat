import Notification, { NotificationType } from "../../models/notification.model.js";
import Taxpayer from "../../models/taxpayer.model.js";
import whatsappService from "../whatsapp/whatsapp.service.js";
import auditLogService from "../auditLog.service.js";

class NotificationService {
  async sendTemplateNotification(
    phone: string,
    type: NotificationType,
    templateName: string,
    templateParams: Record<string, string>,
  ): Promise<void> {
    console.log('[notification.service::sendTemplateNotification] ENTER', { phone, type, templateName, paramsCount: Object.keys(templateParams || {}).length });
    // Check opt-in for non-transactional notifications
    const taxpayer = await Taxpayer.findOne({ phone });
    if (taxpayer && !taxpayer.opted_in_notifications) {
      console.log('[notification.service::sendTemplateNotification] branch: taxpayer opted out');
      const transactional: NotificationType[] = [
        NotificationType.SERVICE_UPDATE,
        NotificationType.TIN_ISSUED,
        NotificationType.TCC_READY,
        NotificationType.PAYMENT_POSTED,
      ];
      if (!transactional.includes(type)) {
        console.log('[notification.service::sendTemplateNotification] branch: non-transactional, skipping');
        console.log(`[Notification] Skipping ${type} for ${phone} (opted out)`);
        console.log('[notification.service::sendTemplateNotification] EXIT', { skipped: true });
        return;
      }
      console.log('[notification.service::sendTemplateNotification] branch: transactional, proceeding');
    } else {
      console.log('[notification.service::sendTemplateNotification] branch: taxpayer opted-in or not found');
    }

    // Create notification record
    const notification = await Notification.create({
      phone,
      type,
      template_name: templateName,
      template_params: templateParams,
      status: "pending",
    });
    console.log('[notification.service::sendTemplateNotification] branch: notification record created');

    // Send via WhatsApp template
    const components = [
      {
        type: "body",
        parameters: Object.values(templateParams).map((v) => ({
          type: "text" as const,
          text: v,
        })),
      },
    ];

    const messageId = await whatsappService.sendTemplateMessage(
      phone,
      templateName,
      "en",
      components,
    );

    // Update notification status
    notification.status = messageId ? "sent" : "failed";
    if (messageId) {
      console.log('[notification.service::sendTemplateNotification] branch: WA message sent');
      notification.whatsapp_message_id = messageId;
      notification.sent_at = new Date();
    } else {
      console.log('[notification.service::sendTemplateNotification] branch: WA message failed');
      notification.error_message = "Failed to send template message";
    }
    await notification.save();

    await auditLogService.log(phone, "notification_sent", {
      type,
      template: templateName,
      status: notification.status,
    });
    console.log('[notification.service::sendTemplateNotification] EXIT', { status: notification.status });
  }

  async scheduleNotification(
    phone: string,
    type: NotificationType,
    templateName: string,
    templateParams: Record<string, string>,
    scheduledAt: Date,
  ): Promise<void> {
    console.log('[notification.service::scheduleNotification] ENTER', { phone, type, templateName, scheduledAt });
    await Notification.create({
      phone,
      type,
      template_name: templateName,
      template_params: templateParams,
      status: "pending",
      scheduled_at: scheduledAt,
    });
    console.log('[notification.service::scheduleNotification] EXIT', { scheduled: true });
  }

  async processScheduledNotifications(): Promise<number> {
    console.log('[notification.service::processScheduledNotifications] ENTER');
    const pending = await Notification.find({
      status: "pending",
      scheduled_at: { $lte: new Date() },
    }).limit(100);
    console.log('[notification.service::processScheduledNotifications] branch: loaded pending', { count: pending.length });

    let sent = 0;
    for (const notification of pending) {
      console.log('[notification.service::processScheduledNotifications] branch: iterating notification', { phone: notification.phone, template: notification.template_name });
      try {
        console.log('[notification.service::processScheduledNotifications] branch: try send');
        const messageId = await whatsappService.sendTemplateMessage(
          notification.phone,
          notification.template_name,
          "en",
          [
            {
              type: "body",
              parameters: Object.values(notification.template_params).map(
                (v) => ({ type: "text" as const, text: v }),
              ),
            },
          ],
        );

        notification.status = messageId ? "sent" : "failed";
        if (messageId) {
          console.log('[notification.service::processScheduledNotifications] branch: messageId present');
          notification.whatsapp_message_id = messageId;
        } else {
          console.log('[notification.service::processScheduledNotifications] branch: messageId missing');
        }
        notification.sent_at = new Date();
        await notification.save();
        sent++;
      } catch (err) {
        console.log('[notification.service::processScheduledNotifications] branch: catch error');
        notification.status = "failed";
        notification.error_message = err instanceof Error ? err.message : "Unknown error";
        await notification.save();
      }
    }
    console.log('[notification.service::processScheduledNotifications] EXIT', { sent });
    return sent;
  }

  async updateDeliveryStatus(
    whatsappMessageId: string,
    status: string,
  ): Promise<void> {
    console.log('[notification.service::updateDeliveryStatus] ENTER', { waMsgIdPresent: !!whatsappMessageId, status });
    const statusMap: Record<string, string> = {
      sent: "sent",
      delivered: "delivered",
      read: "read",
      failed: "failed",
    };

    const mappedStatus = statusMap[status];
    if (!mappedStatus) {
      console.log('[notification.service::updateDeliveryStatus] branch: unmapped status, ignoring');
      console.log('[notification.service::updateDeliveryStatus] EXIT', { updated: false });
      return;
    }

    console.log('[notification.service::updateDeliveryStatus] branch: mapped status, updating');
    await Notification.findOneAndUpdate(
      { whatsapp_message_id: whatsappMessageId },
      {
        status: mappedStatus,
        delivery_status_updated_at: new Date(),
      },
    );
    console.log('[notification.service::updateDeliveryStatus] EXIT', { updated: true, mappedStatus });
  }
}

export default new NotificationService();
