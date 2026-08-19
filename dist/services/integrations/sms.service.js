import { SMS_GATEWAY_URL, SMS_API_KEY } from "../../config.js";
class SMSService {
    gatewayUrl = SMS_GATEWAY_URL;
    apiKey = SMS_API_KEY;
    async sendOTP(phone, code) {
        console.log("[sms.service::sendOTP] ENTER", {
            phoneMasked: phone ? `***${phone.slice(-4)}` : "(none)",
            codeLength: code?.length,
            gatewayUrl: this.gatewayUrl,
        });
        console.log("[SMS] sendOTP stub called:", phone, `code=${code}`);
        console.log("[sms.service::sendOTP] EXIT", { status: 200 });
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
        console.log("[sms.service::sendNotification] ENTER", {
            phoneMasked: phone ? `***${phone.slice(-4)}` : "(none)",
            messageLength: message?.length,
            gatewayUrl: this.gatewayUrl,
        });
        console.log("[SMS] sendNotification stub called:", phone, `message="${message.substring(0, 50)}..."`);
        console.log("[sms.service::sendNotification] EXIT", { status: 200 });
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
        console.log("[sms.service::getDeliveryStatus] ENTER", {
            messageId,
            gatewayUrl: this.gatewayUrl,
        });
        console.log("[SMS] getDeliveryStatus stub called:", messageId);
        console.log("[sms.service::getDeliveryStatus] EXIT", {
            messageId,
            status: 200,
        });
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
