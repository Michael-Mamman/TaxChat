import Session from "../../models/session.model.js";
import { AuthTier } from "../../models/taxpayer.model.js";
import { SESSION_TIMEOUT_SECONDS } from "../../config.js";
class SessionService {
    async createSession(phone, authTier) {
        console.log('[session.service::createSession] ENTER', { phone, authTier });
        // End any existing active sessions
        await Session.updateMany({ phone, is_active: true }, { $set: { is_active: false } });
        console.log('[session.service::createSession] branch: deactivated previous sessions');
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
        console.log('[session.service::createSession] EXIT', { phone, authTier, sessionCreated: true });
        return session;
    }
    async getActiveSession(phone) {
        console.log('[session.service::getActiveSession] ENTER', { phone });
        const session = await Session.findOne({
            phone,
            is_active: true,
            expires_at: { $gt: new Date() },
        }).sort({ createdAt: -1 });
        console.log('[session.service::getActiveSession] EXIT', { phone, found: !!session });
        return session;
    }
    async refreshSession(sessionId) {
        console.log('[session.service::refreshSession] ENTER', { sessionIdPresent: !!sessionId });
        const expires_at = new Date(Date.now() + SESSION_TIMEOUT_SECONDS * 1000);
        await Session.findByIdAndUpdate(sessionId, {
            expires_at,
            last_activity: new Date(),
        });
        console.log('[session.service::refreshSession] EXIT', { refreshed: true });
    }
    async upgradeSession(phone, newTier) {
        console.log('[session.service::upgradeSession] ENTER', { phone, newTier });
        const session = await this.getActiveSession(phone);
        if (!session) {
            console.log('[session.service::upgradeSession] branch: no active session');
            console.log('[session.service::upgradeSession] EXIT', { upgraded: false });
            return null;
        }
        console.log('[session.service::upgradeSession] branch: found session, upgrading');
        session.auth_tier = newTier;
        session.otp_verified = newTier >= AuthTier.TIER_1;
        session.identity_verified = newTier >= AuthTier.TIER_2;
        session.kyc_verified = newTier >= AuthTier.TIER_3;
        session.last_activity = new Date();
        session.expires_at = new Date(Date.now() + SESSION_TIMEOUT_SECONDS * 1000);
        await session.save();
        console.log(`[Session] Upgraded session for ${phone} to tier ${newTier}`);
        console.log('[session.service::upgradeSession] EXIT', { upgraded: true, newTier });
        return session;
    }
    async endSession(sessionId) {
        console.log('[session.service::endSession] ENTER', { sessionIdPresent: !!sessionId });
        await Session.findByIdAndUpdate(sessionId, { is_active: false });
        console.log('[session.service::endSession] EXIT', { ended: true });
    }
    async isSessionValid(phone) {
        console.log('[session.service::isSessionValid] ENTER', { phone });
        const session = await this.getActiveSession(phone);
        const valid = session !== null;
        console.log('[session.service::isSessionValid] EXIT', { phone, valid });
        return valid;
    }
    async getSessionTier(phone) {
        console.log('[session.service::getSessionTier] ENTER', { phone });
        const session = await this.getActiveSession(phone);
        const tier = session?.auth_tier ?? AuthTier.TIER_0;
        console.log('[session.service::getSessionTier] EXIT', { phone, tier });
        return tier;
    }
}
export default new SessionService();
