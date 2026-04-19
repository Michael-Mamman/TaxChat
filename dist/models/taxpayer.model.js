import mongoose, { Schema } from "mongoose";
export var AuthTier;
(function (AuthTier) {
    AuthTier[AuthTier["TIER_0"] = 0] = "TIER_0";
    AuthTier[AuthTier["TIER_1"] = 1] = "TIER_1";
    AuthTier[AuthTier["TIER_2"] = 2] = "TIER_2";
    AuthTier[AuthTier["TIER_3"] = 3] = "TIER_3";
})(AuthTier || (AuthTier = {}));
const EmployerDetailsSchema = new Schema({
    name: { type: String },
    tin: { type: String },
}, { _id: false });
const TaxProfileSchema = new Schema({
    taxpayer_type: {
        type: String,
        enum: ["individual", "corporate", "government"],
    },
    tax_office: { type: String },
    jurisdiction: { type: String },
    lga: { type: String },
    state: { type: String },
    filing_frequency: { type: String },
    tax_types: [{ type: String }],
    compliance_status: {
        type: String,
        enum: ["compliant", "non_compliant", "pending"],
    },
    last_filing_date: { type: Date },
    outstanding_balance: { type: Number, default: 0 },
}, { _id: false });
const TaxpayerSchema = new Schema({
    phone: {
        type: String,
        required: true,
        unique: true,
        index: true,
        set: (v) => v.replace(/[^0-9]/g, ""),
    },
    tin: { type: String, index: true, sparse: true },
    nin: { type: String },
    bvn: { type: String },
    name: { type: String },
    first_name: { type: String },
    last_name: { type: String },
    date_of_birth: { type: String },
    gender: { type: String },
    email: { type: String },
    residential_address: { type: String },
    business_address: { type: String },
    rc_number: { type: String },
    business_name: { type: String },
    employer: { type: EmployerDetailsSchema },
    auth_tier: {
        type: Number,
        enum: [0, 1, 2, 3],
        default: AuthTier.TIER_0,
    },
    is_verified: { type: Boolean, default: false },
    verification_date: { type: Date },
    tax_profile: { type: TaxProfileSchema },
    preferred_language: { type: String, default: "en" },
    opted_in_notifications: { type: Boolean, default: true },
    last_interaction: { type: Date },
    metadata: { type: Schema.Types.Mixed },
}, { timestamps: true });
const Taxpayer = mongoose.model("Taxpayer", TaxpayerSchema);
export default Taxpayer;
