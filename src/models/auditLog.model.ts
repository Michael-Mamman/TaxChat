import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IAuditLog extends Document {
  phone: string;
  session_id?: string;
  action: string;
  channel: "whatsapp" | "system" | "api";
  details: Record<string, unknown>;
  ip_address?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
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

const AuditLog: Model<IAuditLog> = mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;
