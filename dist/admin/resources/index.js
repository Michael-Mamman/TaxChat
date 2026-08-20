import TaxpayerResource from "./taxpayer.resource.js";
import SessionResource from "./session.resource.js";
import OTPResource from "./otp.resource.js";
import ServiceRequestResource from "./serviceRequest.resource.js";
import NotificationResource from "./notification.resource.js";
import ConversationContextResource from "./conversationContext.resource.js";
import AuditLogResource from "./auditLog.resource.js";
const resources = [
    TaxpayerResource,
    SessionResource,
    OTPResource,
    ServiceRequestResource,
    NotificationResource,
    ConversationContextResource,
    AuditLogResource,
];
console.log("[resources::module] EXIT", { resourceCount: resources.length });
export default resources;
