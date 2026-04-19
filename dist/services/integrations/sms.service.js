import { SMS_GATEWAY_URL, SMS_API_KEY } from "../../config.js";
class SMSService {
    gatewayUrl = SMS_GATEWAY_URL;
    apiKey = SMS_API_KEY;
    async sendOTP(phone, code) {
        console.log("[SMS] sendOTP stub called:", phone, `code=${code}`);
        return {
            success: true,
            message: `OTP sent to ${phone} successfully (stub)`,
            status_code: 200,
            data: {
                message_id: `MSG-OTP-${Date.now()}`,
            },
        };
    }
    async sendNotification(phone, message) {
        console.log("[SMS] sendNotification stub called:", phone, `message="${message.substring(0, 50)}..."`);
        return {
            success: true,
            message: `Notification sent to ${phone} successfully (stub)`,
            status_code: 200,
            data: {
                message_id: `MSG-NOTIF-${Date.now()}`,
            },
        };
    }
    async getDeliveryStatus(messageId) {
        console.log("[SMS] getDeliveryStatus stub called:", messageId);
        return {
            success: true,
            message: "Message delivered successfully (stub)",
            status_code: 200,
            data: {
                message_id: messageId,
            },
        };
    }
}
export default new SMSService();
