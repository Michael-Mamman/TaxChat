import mongoose, { Schema, type Document, type Model } from "mongoose";
import { AuthTier } from "./taxpayer.model.js";

export interface ISession extends Document {
  phone: string;
  auth_tier: AuthTier;
  tin?: string;
  is_active: boolean;
  otp_verified: boolean;
  identity_verified: boolean;
  kyc_verified: boolean;
  expires_at: Date;
  last_activity: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    phone: { type: String, required: true, index: true },
    auth_tier: {
      type: Number,
      enum: [0, 1, 2, 3],
      default: AuthTier.TIER_0,
    },
    tin: { type: String },
    is_active: { type: Boolean, default: true },
    otp_verified: { type: Boolean, default: false },
    identity_verified: { type: Boolean, default: false },
    kyc_verified: { type: Boolean, default: false },
    expires_at: { type: Date, required: true, index: true },
    last_activity: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// TTL index: auto-delete expired sessions
SessionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const Session: Model<ISession> = mongoose.model<ISession>("Session", SessionSchema);

export default Session;
