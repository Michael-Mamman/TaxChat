import mongoose, { Schema } from "mongoose";
const OTPSchema = new Schema({
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
}, { timestamps: true });
// TTL index: auto-delete expired OTPs
OTPSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
const OTP = mongoose.model("OTP", OTPSchema);
export default OTP;
