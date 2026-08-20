import mongoose, { Schema } from "mongoose";
export var ServiceRequestStatus;
(function (ServiceRequestStatus) {
    ServiceRequestStatus["DRAFT"] = "draft";
    ServiceRequestStatus["SUBMITTED"] = "submitted";
    ServiceRequestStatus["IN_PROGRESS"] = "in_progress";
    ServiceRequestStatus["PENDING_INFO"] = "pending_info";
    ServiceRequestStatus["ESCALATED"] = "escalated";
    ServiceRequestStatus["RESOLVED"] = "resolved";
    ServiceRequestStatus["CLOSED"] = "closed";
    ServiceRequestStatus["CANCELLED"] = "cancelled";
})(ServiceRequestStatus || (ServiceRequestStatus = {}));
export var ServiceRequestType;
(function (ServiceRequestType) {
    ServiceRequestType["TIN_REG"] = "TIN-REG";
    ServiceRequestType["TCC_APP"] = "TCC-APP";
    ServiceRequestType["PAY_TRACE"] = "PAY-TRACE";
    ServiceRequestType["PROFILE_UPD"] = "PROFILE-UPD";
    ServiceRequestType["FILING_SUPPORT"] = "FILING-SUPPORT";
    ServiceRequestType["ASSESS_QUERY"] = "ASSESS-QUERY";
    ServiceRequestType["ASSESS_OBJ"] = "ASSESS-OBJ";
    ServiceRequestType["PENALTY_QUERY"] = "PENALTY-QUERY";
    ServiceRequestType["PENALTY_WAIVER"] = "PENALTY-WAIVER";
    ServiceRequestType["WHT_CREDIT_QUERY"] = "WHT-CREDIT-QUERY";
    ServiceRequestType["GENERAL"] = "GENERAL";
})(ServiceRequestType || (ServiceRequestType = {}));
const ServiceRequestSchema = new Schema({
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
}, { timestamps: true });
/**
 * Builds a reference number in the TC-YYYYMMDD-NNNN format. Exported so the
 * admin panel can fill the field in before mongoose validates a new record.
 */
export function generateReferenceNumber() {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `TC-${dateStr}-${rand}`;
}
// Auto-generate reference number before save
ServiceRequestSchema.pre("save", function (next) {
    if (!this.reference_number) {
        this.reference_number = generateReferenceNumber();
    }
    next();
});
const ServiceRequest = mongoose.model("ServiceRequest", ServiceRequestSchema);
export default ServiceRequest;
