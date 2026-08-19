import notificationService from "../services/notification/notification.service.js";
import Notification from "../models/notification.model.js";
export const sendNotification = async (req, res) => {
    console.log('[notification.controller::sendNotification] ENTER', {
        hasPhone: Boolean(req.body?.phone),
        template_name: req.body?.template_name,
        type: req.body?.type,
    });
    try {
        console.log('[notification.controller::sendNotification] branch: try');
        const { phone, template_name, template_params, language } = req.body;
        if (!phone || !template_name) {
            console.log('[notification.controller::sendNotification] branch: missing phone or template_name');
            console.log('[notification.controller::sendNotification] EXIT - 400 validation');
            return res.status(400).json({ success: false, message: "phone and template_name are required" });
        }
        console.log('[notification.controller::sendNotification] branch: sending template notification');
        await notificationService.sendTemplateNotification(phone, req.body.type || "system", template_name, template_params || {});
        console.log('[notification.controller::sendNotification] EXIT - success');
        return res.json({ success: true, message: "Notification sent" });
    }
    catch (err) {
        console.log('[notification.controller::sendNotification] branch: catch');
        console.error("Error sending notification:", err);
        console.log('[notification.controller::sendNotification] EXIT - 500 error');
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
export const scheduleNotification = async (req, res) => {
    console.log('[notification.controller::scheduleNotification] ENTER', {
        hasPhone: Boolean(req.body?.phone),
        template_name: req.body?.template_name,
        scheduled_at: req.body?.scheduled_at,
    });
    try {
        console.log('[notification.controller::scheduleNotification] branch: try');
        const { phone, template_name, template_params, language, scheduled_at } = req.body;
        if (!phone || !template_name || !scheduled_at) {
            console.log('[notification.controller::scheduleNotification] branch: missing required fields');
            console.log('[notification.controller::scheduleNotification] EXIT - 400 validation');
            return res.status(400).json({ success: false, message: "phone, template_name, and scheduled_at are required" });
        }
        console.log('[notification.controller::scheduleNotification] branch: scheduling notification');
        await notificationService.scheduleNotification(phone, req.body.type || "system", template_name, template_params || {}, new Date(scheduled_at));
        console.log('[notification.controller::scheduleNotification] EXIT - success');
        return res.json({ success: true, message: "Notification scheduled" });
    }
    catch (err) {
        console.log('[notification.controller::scheduleNotification] branch: catch');
        console.error("Error scheduling notification:", err);
        console.log('[notification.controller::scheduleNotification] EXIT - 500 error');
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
export const getNotificationHistory = async (req, res) => {
    console.log('[notification.controller::getNotificationHistory] ENTER', {
        phone: req.params?.phone,
        limit: req.query?.limit,
    });
    try {
        console.log('[notification.controller::getNotificationHistory] branch: try');
        const { phone } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const notifications = await Notification.find({ phone })
            .sort({ createdAt: -1 })
            .limit(limit);
        console.log('[notification.controller::getNotificationHistory] query done', { count: notifications.length });
        console.log('[notification.controller::getNotificationHistory] EXIT - success');
        return res.json({ success: true, data: notifications });
    }
    catch (err) {
        console.log('[notification.controller::getNotificationHistory] branch: catch');
        console.error("Error fetching notifications:", err);
        console.log('[notification.controller::getNotificationHistory] EXIT - 500 error');
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
