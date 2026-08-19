import mongoose, { Schema } from "mongoose";
import { AuthTier } from "./taxpayer.model.js";
const SessionSchema = new Schema({
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
}, { timestamps: true });
// TTL index: auto-delete expired sessions
SessionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
const Session = mongoose.model("Session", SessionSchema);
export default Session;
