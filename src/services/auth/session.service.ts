import Session from "../../models/session.model.js";
import type { ISession } from "../../models/session.model.js";
import { AuthTier } from "../../models/taxpayer.model.js";
import { SESSION_TIMEOUT_SECONDS } from "../../config.js";

class SessionService {
  async createSession(phone: string, authTier: AuthTier): Promise<ISession> {
    // End any existing active sessions
    await Session.updateMany(
      { phone, is_active: true },
      { $set: { is_active: false } },
    );

    const expires_at = new Date(Date.now() + SESSION_TIMEOUT_SECONDS * 1000);

    const session = await Session.create({
      phone,
      auth_tier: authTier,
      is_active: true,
      otp_verified: authTier >= AuthTier.TIER_1,
      identity_verified: authTier >= AuthTier.TIER_2,
      kyc_verified: authTier >= AuthTier.TIER_3,
      expires_at,
      last_activity: new Date(),
    });

    console.log(`[Session] Created session for ${phone} at tier ${authTier}`);
    return session;
  }

  async getActiveSession(phone: string): Promise<ISession | null> {
    return Session.findOne({
      phone,
      is_active: true,
      expires_at: { $gt: new Date() },
    }).sort({ createdAt: -1 });
  }

  async refreshSession(sessionId: string): Promise<void> {
    const expires_at = new Date(Date.now() + SESSION_TIMEOUT_SECONDS * 1000);
    await Session.findByIdAndUpdate(sessionId, {
      expires_at,
      last_activity: new Date(),
    });
  }

  async upgradeSession(
    phone: string,
    newTier: AuthTier,
  ): Promise<ISession | null> {
    const session = await this.getActiveSession(phone);
    if (!session) return null;

    session.auth_tier = newTier;
    session.otp_verified = newTier >= AuthTier.TIER_1;
    session.identity_verified = newTier >= AuthTier.TIER_2;
    session.kyc_verified = newTier >= AuthTier.TIER_3;
    session.last_activity = new Date();
    session.expires_at = new Date(
      Date.now() + SESSION_TIMEOUT_SECONDS * 1000,
    );
    await session.save();

    console.log(`[Session] Upgraded session for ${phone} to tier ${newTier}`);
    return session;
  }

  async endSession(sessionId: string): Promise<void> {
    await Session.findByIdAndUpdate(sessionId, { is_active: false });
  }

  async isSessionValid(phone: string): Promise<boolean> {
    const session = await this.getActiveSession(phone);
    return session !== null;
  }

  async getSessionTier(phone: string): Promise<number> {
    const session = await this.getActiveSession(phone);
    return session?.auth_tier ?? AuthTier.TIER_0;
  }
}

export default new SessionService();
