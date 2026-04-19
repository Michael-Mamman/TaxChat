import mongoose, { Schema } from "mongoose";
const AuditLogSchema = new Schema({
    phone: { type: String, required: true, index: true },
    session_id: { type: String },
    action: { type: String, required: true },
    channel: {
        type: String,
        enum: ["whatsapp", "system", "api"],
        default: "whatsapp",
    },
    details: { type: Schema.Types.Mixed, default: {} },
    ip_address: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
});
// Compound index for efficient queries
AuditLogSchema.index({ phone: 1, timestamp: -1 });
const AuditLog = mongoose.model("AuditLog", AuditLogSchema);
export default AuditLog;
