import mongoose, { Schema, type Document, type Model } from "mongoose";

export enum ServiceRequestStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted",
  IN_PROGRESS = "in_progress",
  PENDING_INFO = "pending_info",
  ESCALATED = "escalated",
  RESOLVED = "resolved",
  CLOSED = "closed",
  CANCELLED = "cancelled",
}

export enum ServiceRequestType {
  TIN_REG = "TIN-REG",
  TCC_APP = "TCC-APP",
  PAY_TRACE = "PAY-TRACE",
  PROFILE_UPD = "PROFILE-UPD",
  FILING_SUPPORT = "FILING-SUPPORT",
  ASSESS_QUERY = "ASSESS-QUERY",
  ASSESS_OBJ = "ASSESS-OBJ",
  PENALTY_QUERY = "PENALTY-QUERY",
  PENALTY_WAIVER = "PENALTY-WAIVER",
  WHT_CREDIT_QUERY = "WHT-CREDIT-QUERY",
  GENERAL = "GENERAL",
}

export interface IServiceRequest extends Document {
  reference_number: string;
  phone: string;
  tin?: string;
  type: ServiceRequestType;
  status: ServiceRequestStatus;
  subject: string;
  description: string;
  itsm_ticket_id?: string;
  sla_deadline?: Date;
  first_response_deadline?: Date;
  assigned_officer?: string;
  priority: "low" | "medium" | "high" | "critical";
  attachments?: string[];
  resolution_notes?: string;
  escalation_count: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceRequestSchema = new Schema<IServiceRequest>(
  {
    reference_number: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    phone: { type: String, required: true, index: true },
    tin: { type: String },
    type: {
      type: String,
      enum: Object.values(ServiceRequestType),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ServiceRequestStatus),
      default: ServiceRequestStatus.SUBMITTED,
    },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    itsm_ticket_id: { type: String },
    sla_deadline: { type: Date },
    first_response_deadline: { type: Date },
    assigned_officer: { type: String },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    attachments: [{ type: String }],
    resolution_notes: { type: String },
    escalation_count: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

// Auto-generate reference number before save
ServiceRequestSchema.pre("save", function (next) {
  if (!this.reference_number) {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.reference_number = `TC-${dateStr}-${rand}`;
  }
  next();
});

const ServiceRequest: Model<IServiceRequest> = mongoose.model<IServiceRequest>(
  "ServiceRequest",
  ServiceRequestSchema,
);

export default ServiceRequest;
