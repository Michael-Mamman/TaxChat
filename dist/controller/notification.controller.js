import notificationService from "../services/notification/notification.service.js";
import Notification from "../models/notification.model.js";
export const sendNotification = async (req, res) => {
    try {
        const { phone, template_name, template_params, language } = req.body;
        if (!phone || !template_name) {
            return res.status(400).json({ success: false, message: "phone and template_name are required" });
        }
        await notificationService.sendTemplateNotification(phone, req.body.type || "system", template_name, template_params || {});
        return res.json({ success: true, message: "Notification sent" });
    }
    catch (err) {
        console.error("Error sending notification:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
export const scheduleNotification = async (req, res) => {
    try {
        const { phone, template_name, template_params, language, scheduled_at } = req.body;
        if (!phone || !template_name || !scheduled_at) {
            return res.status(400).json({ success: false, message: "phone, template_name, and scheduled_at are required" });
        }
        await notificationService.scheduleNotification(phone, req.body.type || "system", template_name, template_params || {}, new Date(scheduled_at));
        return res.json({ success: true, message: "Notification scheduled" });
    }
    catch (err) {
        console.error("Error scheduling notification:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
export const getNotificationHistory = async (req, res) => {
    try {
        const { phone } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const notifications = await Notification.find({ phone })
            .sort({ createdAt: -1 })
            .limit(limit);
        return res.json({ success: true, data: notifications });
    }
    catch (err) {
        console.error("Error fetching notifications:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
