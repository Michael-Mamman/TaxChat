import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IOTP extends Document {
  phone: string;
  code: string;
  purpose: "auth" | "verification" | "transaction";
  attempts: number;
  is_used: boolean;
  expires_at: Date;
  createdAt: Date;
}

const OTPSchema = new Schema<IOTP>(
  {
    phone: { type: String, required: true, index: true },
    code: { type: String, required: true },
    purpose: {
      type: String,
      enum: ["auth", "verification", "transaction"],
      required: true,
    },
    attempts: { type: Number, default: 0 },
    is_used: { type: Boolean, default: false },
    expires_at: { type: Date, required: true, index: true },
  },
  { timestamps: true },
);

// TTL index: auto-delete expired OTPs
OTPSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const OTP: Model<IOTP> = mongoose.model<IOTP>("OTP", OTPSchema);

export default OTP;
