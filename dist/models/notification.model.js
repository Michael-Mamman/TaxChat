import mongoose, { Schema } from "mongoose";
export var NotificationType;
(function (NotificationType) {
    NotificationType["SERVICE_UPDATE"] = "service_update";
    NotificationType["TIN_ISSUED"] = "tin_issued";
    NotificationType["TCC_READY"] = "tcc_ready";
    NotificationType["PAYMENT_POSTED"] = "payment_posted";
    NotificationType["FILING_DEADLINE"] = "filing_deadline";
    NotificationType["ASSESSMENT_NOTICE"] = "assessment_notice";
    NotificationType["PENALTY_ALERT"] = "penalty_alert";
    NotificationType["SESSION_EXPIRY"] = "session_expiry";
    NotificationType["SYSTEM"] = "system";
})(NotificationType || (NotificationType = {}));
const NotificationSchema = new Schema({
    phone: { type: String, required: true, index: true },
    type: {
        type: String,
        enum: Object.values(NotificationType),
        required: true,
    },
    template_name: { type: String, required: true },
    template_params: { type: Schema.Types.Mixed, default: {} },
    status: {
        type: String,
        enum: ["pending", "sent", "delivered", "read", "failed"],
        default: "pending",
    },
    whatsapp_message_id: { type: String },
    scheduled_at: { type: Date },
    sent_at: { type: Date },
    delivery_status_updated_at: { type: Date },
    error_message: { type: String },
    service_request_id: { type: String },
}, { timestamps: true });
NotificationSchema.index({ status: 1, scheduled_at: 1 });
const Notification = mongoose.model("Notification", NotificationSchema);
export default Notification;
