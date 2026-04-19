import mongoose, { Schema, type Document, type Model } from "mongoose";

export enum NotificationType {
  SERVICE_UPDATE = "service_update",
  TIN_ISSUED = "tin_issued",
  TCC_READY = "tcc_ready",
  PAYMENT_POSTED = "payment_posted",
  FILING_DEADLINE = "filing_deadline",
  ASSESSMENT_NOTICE = "assessment_notice",
  PENALTY_ALERT = "penalty_alert",
  SESSION_EXPIRY = "session_expiry",
  SYSTEM = "system",
}

export interface INotification extends Document {
  phone: string;
  type: NotificationType;
  template_name: string;
  template_params: Record<string, string>;
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  whatsapp_message_id?: string;
  scheduled_at?: Date;
  sent_at?: Date;
  delivery_status_updated_at?: Date;
  error_message?: string;
  service_request_id?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
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
  },
  { timestamps: true },
);

NotificationSchema.index({ status: 1, scheduled_at: 1 });

const Notification: Model<INotification> = mongoose.model<INotification>(
  "Notification",
  NotificationSchema,
);

export default Notification;
