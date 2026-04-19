import mongoose, { Schema, type Document, type Model } from "mongoose";

export enum AuthTier {
  TIER_0 = 0, // No auth (general enquiry)
  TIER_1 = 1, // TIN + OTP
  TIER_2 = 2, // TIN + OTP + NIN/BVN
  TIER_3 = 3, // Full KYC (NIN + biometric + photo)
}

export interface ITaxProfile {
  taxpayer_type?: "individual" | "corporate" | "government";
  tax_office?: string;
  jurisdiction?: string;
  lga?: string;
  state?: string;
  filing_frequency?: string;
  tax_types?: string[];
  compliance_status?: "compliant" | "non_compliant" | "pending";
  last_filing_date?: Date;
  outstanding_balance?: number;
}

export interface IEmployerDetails {
  name?: string;
  tin?: string;
}

export interface ITaxpayer extends Document {
  phone: string;
  tin?: string;
  nin?: string;
  bvn?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  gender?: string;
  email?: string;
  residential_address?: string;
  business_address?: string;
  rc_number?: string;
  business_name?: string;
  employer?: IEmployerDetails;
  auth_tier: AuthTier;
  is_verified: boolean;
  verification_date?: Date;
  tax_profile?: ITaxProfile;
  preferred_language: string;
  opted_in_notifications: boolean;
  last_interaction?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const EmployerDetailsSchema = new Schema(
  {
    name: { type: String },
    tin: { type: String },
  },
  { _id: false },
);

const TaxProfileSchema = new Schema(
  {
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
  },
  { _id: false },
);

const TaxpayerSchema = new Schema<ITaxpayer>(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      set: (v: string) => v.replace(/[^0-9]/g, ""),
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
  },
  { timestamps: true },
);

const Taxpayer: Model<ITaxpayer> = mongoose.model<ITaxpayer>("Taxpayer", TaxpayerSchema);

export default Taxpayer;
