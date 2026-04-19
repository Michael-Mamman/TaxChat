import crypto from "crypto";
import OTP from "../../models/otp.model.js";
import smsService from "../integrations/sms.service.js";
import { OTP_EXPIRY_SECONDS, MAX_OTP_ATTEMPTS } from "../../config.js";

class OTPService {
  generateCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  async sendOTP(
    phone: string,
    purpose: "auth" | "verification" | "transaction" = "auth",
  ): Promise<{ success: boolean; message: string }> {
    // Invalidate existing OTPs for this phone+purpose
    await OTP.updateMany(
      { phone, purpose, is_used: false },
      { $set: { is_used: true } },
    );

    const code = this.generateCode();
    const expires_at = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);

    await OTP.create({
      phone,
      code,
      purpose,
      attempts: 0,
      is_used: false,
      expires_at,
    });

    // Send via SMS gateway
    const smsResult = await smsService.sendOTP(phone, code);
    console.log(`[OTP] Sent OTP to ${phone}: ${smsResult.message}`);

    // Mask phone for user-facing message
    const maskedPhone = phone.slice(0, -4).replace(/./g, "*") + phone.slice(-4);
    return {
      success: true,
      message: `OTP sent to ${maskedPhone}`,
    };
  }

  async verifyOTP(
    phone: string,
    code: string,
  ): Promise<{ valid: boolean; message: string; locked?: boolean }> {
    const otp = await OTP.findOne({
      phone,
      is_used: false,
      expires_at: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otp) {
      return {
        valid: false,
        message: "No active OTP found. Please request a new one.",
      };
    }

    if (otp.attempts >= MAX_OTP_ATTEMPTS) {
      otp.is_used = true;
      await otp.save();
      return {
        valid: false,
        message:
          "Maximum attempts exceeded. Your account is locked for 30 minutes. Please try again later or type AGENT for help.",
        locked: true,
      };
    }

    otp.attempts += 1;

    if (otp.code !== code) {
      await otp.save();
      const remaining = MAX_OTP_ATTEMPTS - otp.attempts;
      return {
        valid: false,
        message: `Invalid OTP. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`,
      };
    }

    otp.is_used = true;
    await otp.save();
    return { valid: true, message: "OTP verified successfully." };
  }
}

export default new OTPService();
