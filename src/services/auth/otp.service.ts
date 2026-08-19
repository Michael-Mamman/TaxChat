import crypto from "crypto";
import OTP from "../../models/otp.model.js";
import smsService from "../integrations/sms.service.js";
import {
  OTP_EXPIRY_SECONDS,
  MAX_OTP_ATTEMPTS,
  OTP_DELIVERY_CHANNEL,
  SMS_GATEWAY_URL,
} from "../../config.js";
import whatsappService from "../whatsapp/whatsapp.service.js";

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

    const maskedPhone = phone.slice(0, -4).replace(/./g, "*") + phone.slice(-4);

    // Deliver over WhatsApp when configured to. Without this the code is
    // generated, stored, and seen by nobody: the SMS gateway is a stub with no
    // URL, so the taxpayer waits for a message that never arrives and every
    // tier-gated flow is unreachable.
    if (OTP_DELIVERY_CHANNEL === "whatsapp") {
      console.warn("[otp.service::sendOTP] delivering OTP over WhatsApp - same-channel delivery is not a second factor and must not be used in production");
      await whatsappService.sendMessage(
        phone,
        `Your NRS TaxChat verification code is *${code}*.\n\n` +
          `It expires in ${Math.round(OTP_EXPIRY_SECONDS / 60)} minutes. Do not share it with anyone.`,
      );
      console.log('[otp.service::sendOTP] EXIT', { channel: 'whatsapp', delivered: true });
      return { success: true, message: "I've sent your verification code to this chat" };
    }

    if (!SMS_GATEWAY_URL) {
      // Say so, rather than reporting a delivery that did not happen.
      console.error('[otp.service::sendOTP] no SMS gateway configured and no fallback channel set');
      console.log('[otp.service::sendOTP] EXIT', { channel: 'none', delivered: false });
      return {
        success: false,
        message: "I couldn't send your verification code - the SMS service isn't available. Please type AGENT to speak with an officer.",
      };
    }

    const smsResult = await smsService.sendOTP(phone, code);
    console.log('[otp.service::sendOTP] EXIT', { channel: 'sms', delivered: smsResult.success });
    return {
      success: smsResult.success,
      message: smsResult.success
        ? `OTP sent to ${maskedPhone}`
        : "I couldn't send your verification code right now. Please try again shortly.",
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
