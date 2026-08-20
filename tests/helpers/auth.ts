/**
 * Clears the tiered authentication gate.
 *
 * Most flows are Tier 1 or above, so a scenario that selects one lands in the
 * auth sub-flow (TIN, then OTP) before the flow itself starts. The OTP is
 * random and "delivered" by a stubbed SMS gateway, so tests read it back out of
 * Mongo the same way the verification step will.
 */
import OTP from "../../src/models/otp.model.js";
import type { Bot } from "./bot.js";
import type { Reply } from "./outbound.js";

/** Any TIN is accepted by the JTB stub; this is a well-formed one. */
export const TEST_TIN = "1234567890";

export async function currentOtp(phone: string): Promise<string> {
  const doc = await OTP.findOne({ phone, is_used: false }).sort({ createdAt: -1 });
  if (!doc) throw new Error(`no OTP was issued for ${phone}`);
  return doc.code;
}

/**
 * Walk a bot through TIN + OTP verification, leaving it at Tier 1.
 *
 * Returns the replies from the final turn. A pending flow resumes as part of
 * OTP verification, so its opening message arrives on this turn - there is no
 * separate turn on which to observe it.
 */
export async function completeTier1(bot: Bot): Promise<Reply[]> {
  await bot.say(TEST_TIN);
  return bot.say(await currentOtp(bot.phone));
}

/** A well-formed NIN; the NIMC stub accepts any value. */
export const TEST_NIN = "12345678901";

/**
 * Walk a bot through TIN + OTP + identity verification, leaving it at Tier 2.
 *
 * Tier 2 flows (TCC, profile update, assessment query) gate on NIN/BVN as well,
 * so completeTier1 alone leaves the conversation still inside the auth sub-flow.
 */
export async function completeTier2(bot: Bot): Promise<Reply[]> {
  await completeTier1(bot);
  return bot.say(TEST_NIN);
}
