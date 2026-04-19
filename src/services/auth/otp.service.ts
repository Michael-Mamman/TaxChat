import crypto from "crypto";
import OTP from "../../models/otp.model.js";
import smsService from "../integrations/sms.service.js";
import { OTP_EXPIRY_SECONDS, MAX_OTP_ATTEMPTS } from "../../config.js";

class OTPService {
  generateCode(): string {
    console.log('[otp.service::generateCode] ENTER');
    const code = crypto.randomInt(100000, 999999).toString();
    console.log('[otp.service::generateCode] EXIT', { otpGenerated: true, length: code.length });
    return code;
  }

  async sendOTP(
    phone: string,
    purpose: "auth" | "verification" | "transaction" = "auth",
  ): Promise<{ success: boolean; message: string }> {
    console.log('[otp.service::sendOTP] ENTER', { phone, purpose });
    // Invalidate existing OTPs for this phone+purpose
    await OTP.updateMany(
      { phone, purpose, is_used: false },
      { $set: { is_used: true } },
    );
    console.log('[otp.service::sendOTP] branch: invalidated existing OTPs');

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
    console.log('[otp.service::sendOTP] branch: created OTP record');

    // Send via SMS gateway
    const smsResult = await smsService.sendOTP(phone, code);
    console.log(`[OTP] Sent OTP to ${phone}: ${smsResult.message}`);

    // Mask phone for user-facing message
    const maskedPhone = phone.slice(0, -4).replace(/./g, "*") + phone.slice(-4);
    console.log('[otp.service::sendOTP] EXIT', { phone, success: true });
    return {
      success: true,
      message: `OTP sent to ${maskedPhone}`,
    };
  }

  async verifyOTP(
    phone: string,
    code: string,
  ): Promise<{ valid: boolean; message: string; locked?: boolean }> {
    console.log('[otp.service::verifyOTP] ENTER', { phone, otpPresent: !!code });
    const otp = await OTP.findOne({
      phone,
      is_used: false,
      expires_at: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otp) {
      console.log('[otp.service::verifyOTP] branch: no active OTP found');
      console.log('[otp.service::verifyOTP] EXIT', { valid: false });
      return {
        valid: false,
        message: "No active OTP found. Please request a new one.",
      };
    }

    if (otp.attempts >= MAX_OTP_ATTEMPTS) {
      console.log('[otp.service::verifyOTP] branch: max attempts exceeded');
      otp.is_used = true;
      await otp.save();
      console.log('[otp.service::verifyOTP] EXIT', { valid: false, locked: true });
      return {
        valid: false,
        message:
          "Maximum attempts exceeded. Your account is locked for 30 minutes. Please try again later or type AGENT for help.",
        locked: true,
      };
    }

    otp.attempts += 1;

    if (otp.code !== code) {
      console.log('[otp.service::verifyOTP] branch: code mismatch');
      await otp.save();
      const remaining = MAX_OTP_ATTEMPTS - otp.attempts;
      console.log('[otp.service::verifyOTP] EXIT', { valid: false, remaining });
      return {
        valid: false,
        message: `Invalid OTP. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`,
      };
    }

    console.log('[otp.service::verifyOTP] branch: code match, marking used');
    otp.is_used = true;
    await otp.save();
    console.log('[otp.service::verifyOTP] EXIT', { valid: true });
    return { valid: true, message: "OTP verified successfully." };
  }
}

export default new OTPService();
