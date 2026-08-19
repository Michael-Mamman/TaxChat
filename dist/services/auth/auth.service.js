import { AuthTier } from "../../models/taxpayer.model.js";
import otpService from "./otp.service.js";
import sessionService from "./session.service.js";
import nimcService from "../integrations/nimc.service.js";
import nibssService from "../integrations/nibss.service.js";
import jtbService from "../integrations/jtb.service.js";
import Taxpayer from "../../models/taxpayer.model.js";
const TIER_REQUIREMENTS = [
    { tier: 0, requires_tin: false, requires_otp: false, requires_nin_or_bvn: false, requires_kyc: false },
    { tier: 1, requires_tin: true, requires_otp: true, requires_nin_or_bvn: false, requires_kyc: false },
    { tier: 2, requires_tin: true, requires_otp: true, requires_nin_or_bvn: true, requires_kyc: false },
    { tier: 3, requires_tin: true, requires_otp: true, requires_nin_or_bvn: true, requires_kyc: true },
];
const FLOW_AUTH_MAP = {
    tin_registration: 3,
    tin_retrieval: 1,
    tax_clearance: 2,
    payment_confirmation: 1,
    profile_update: 2,
    filing_support: 1,
    assessment_query: 2,
    penalty_query: 1,
    wht_credit_note: 1,
    general_enquiry: 0,
};
class AuthService {
    getTierRequirements(tier) {
        console.log('[auth.service::getTierRequirements] ENTER', { tier });
        const result = TIER_REQUIREMENTS[tier] ?? TIER_REQUIREMENTS[0];
        console.log('[auth.service::getTierRequirements] EXIT', { tier: result.tier });
        return result;
    }
    getRequiredTierForFlow(flowName) {
        console.log('[auth.service::getRequiredTierForFlow] ENTER', { flowName });
        const result = FLOW_AUTH_MAP[flowName] ?? 0;
        console.log('[auth.service::getRequiredTierForFlow] EXIT', { flowName, requiredTier: result });
        return result;
    }
    async initiateAuth(phone, requiredTier) {
        console.log('[auth.service::initiateAuth] ENTER', { phone, requiredTier });
        // Check existing session
        const currentTier = await sessionService.getSessionTier(phone);
        console.log('[auth.service::initiateAuth] branch: got currentTier', { currentTier });
        if (currentTier >= requiredTier) {
            console.log('[auth.service::initiateAuth] branch: already authenticated');
            console.log('[auth.service::initiateAuth] EXIT', { success: true, tier: currentTier });
            return {
                success: true,
                tier: currentTier,
                message: "Already authenticated at required level.",
            };
        }
        const requirements = this.getTierRequirements(requiredTier);
        // Determine next step needed
        if (requirements.requires_tin && currentTier < AuthTier.TIER_1) {
            console.log('[auth.service::initiateAuth] branch: requires_tin');
            console.log('[auth.service::initiateAuth] EXIT', { requires_next: 'tin' });
            return {
                success: false,
                tier: currentTier,
                message: "Please enter your TIN (Tax Identification Number).",
                requires_next: "tin",
            };
        }
        if (requirements.requires_otp && currentTier < AuthTier.TIER_1) {
            console.log('[auth.service::initiateAuth] branch: requires_otp');
            console.log('[auth.service::initiateAuth] EXIT', { requires_next: 'otp' });
            return {
                success: false,
                tier: currentTier,
                message: "OTP verification required.",
                requires_next: "otp",
            };
        }
        if (requirements.requires_nin_or_bvn && currentTier < AuthTier.TIER_2) {
            console.log('[auth.service::initiateAuth] branch: requires_nin_or_bvn');
            console.log('[auth.service::initiateAuth] EXIT', { requires_next: 'nin_bvn' });
            return {
                success: false,
                tier: currentTier,
                message: "Please provide your NIN or BVN for identity verification.",
                requires_next: "nin_bvn",
            };
        }
        if (requirements.requires_kyc && currentTier < AuthTier.TIER_3) {
            console.log('[auth.service::initiateAuth] branch: requires_kyc');
            console.log('[auth.service::initiateAuth] EXIT', { requires_next: 'kyc' });
            return {
                success: false,
                tier: currentTier,
                message: "Full KYC verification is required. Please provide your NIN and a photo of a valid ID.",
                requires_next: "kyc",
            };
        }
        console.log('[auth.service::initiateAuth] branch: auth complete fallthrough');
        console.log('[auth.service::initiateAuth] EXIT', { success: true, tier: currentTier });
        return {
            success: true,
            tier: currentTier,
            message: "Authentication complete.",
        };
    }
    async verifyTIN(phone, tin) {
        console.log('[auth.service::verifyTIN] ENTER', { phone, tinLength: tin?.length });
        const result = await jtbService.verifyTIN(tin);
        if (!result.success || !result.data) {
            console.log('[auth.service::verifyTIN] branch: TIN verify failed');
            console.log('[auth.service::verifyTIN] EXIT', { success: false });
            return {
                success: false,
                tier: 0,
                message: "TIN verification failed. Please check your TIN and try again.",
            };
        }
        console.log('[auth.service::verifyTIN] branch: TIN verify success, updating taxpayer');
        // Update taxpayer record
        await Taxpayer.findOneAndUpdate({ phone }, {
            tin,
            first_name: result.data.first_name,
            last_name: result.data.last_name,
            last_interaction: new Date(),
        }, { upsert: true });
        console.log('[auth.service::verifyTIN] branch: sending OTP');
        // Send OTP to registered phone
        const otpResult = await otpService.sendOTP(phone);
        console.log('[auth.service::verifyTIN] EXIT', { success: true, requires_next: 'otp' });
        if (!otpResult.success) {
            // Do not ask for a code that was never delivered.
            return {
                success: false,
                tier: 0,
                message: `TIN verified, but ${otpResult.message}`,
            };
        }
        return {
            success: true,
            tier: 0,
            message: `TIN verified. ${otpResult.message}. Please enter the 6-digit code.`,
            requires_next: "otp",
        };
    }
    /** Issue a fresh code, for when the previous one expired or never arrived. */
    async resendOTP(phone) {
        console.log('[auth.service::resendOTP] ENTER', { phone });
        const result = await otpService.sendOTP(phone);
        console.log('[auth.service::resendOTP] EXIT', { success: result.success });
        return result.success
            ? { success: true, message: `${result.message}. Please enter the 6-digit code.` }
            : result;
    }
    async verifyOTP(phone, code) {
        console.log('[auth.service::verifyOTP] ENTER', { phone, otpPresent: !!code });
        const otpResult = await otpService.verifyOTP(phone, code);
        if (!otpResult.valid) {
            console.log('[auth.service::verifyOTP] branch: invalid OTP');
            console.log('[auth.service::verifyOTP] EXIT', { success: false });
            return {
                success: false,
                tier: 0,
                message: otpResult.message,
            };
        }
        console.log('[auth.service::verifyOTP] branch: valid OTP, creating session');
        // Create or upgrade session to Tier 1
        const session = await sessionService.createSession(phone, AuthTier.TIER_1);
        // Update taxpayer
        const taxpayer = await Taxpayer.findOne({ phone });
        const name = [taxpayer?.first_name, taxpayer?.last_name]
            .filter(Boolean)
            .join(" ");
        console.log('[auth.service::verifyOTP] EXIT', { success: true, tier: AuthTier.TIER_1, sessionPresent: !!session });
        return {
            success: true,
            tier: AuthTier.TIER_1,
            session_id: String(session._id),
            message: `Verified. Welcome back${name ? `, ${name}` : ""}. Your session is active.`,
        };
    }
    async verifyIdentity(phone, type, value) {
        console.log('[auth.service::verifyIdentity] ENTER', { phone, type, valueLength: value?.length });
        if (type === "nin") {
            console.log('[auth.service::verifyIdentity] branch: type=nin');
            const result = await nimcService.verifyNIN(value);
            if (!result.success || !result.data?.is_valid) {
                console.log('[auth.service::verifyIdentity] branch: NIN invalid');
                console.log('[auth.service::verifyIdentity] EXIT', { success: false, type });
                return {
                    success: false,
                    tier: 1,
                    message: "NIN verification failed. Please check and try again.",
                };
            }
            console.log('[auth.service::verifyIdentity] branch: NIN valid, updating taxpayer');
            await Taxpayer.findOneAndUpdate({ phone }, { nin: value });
        }
        else {
            console.log('[auth.service::verifyIdentity] branch: type=bvn');
            const result = await nibssService.verifyBVN(value);
            if (!result.success || !result.data?.is_valid) {
                console.log('[auth.service::verifyIdentity] branch: BVN invalid');
                console.log('[auth.service::verifyIdentity] EXIT', { success: false, type });
                return {
                    success: false,
                    tier: 1,
                    message: "BVN verification failed. Please check and try again.",
                };
            }
            console.log('[auth.service::verifyIdentity] branch: BVN valid, updating taxpayer');
            await Taxpayer.findOneAndUpdate({ phone }, { bvn: value });
        }
        console.log('[auth.service::verifyIdentity] branch: upgrading session to TIER_2');
        // Upgrade to Tier 2
        await sessionService.upgradeSession(phone, AuthTier.TIER_2);
        console.log('[auth.service::verifyIdentity] EXIT', { success: true, tier: AuthTier.TIER_2 });
        return {
            success: true,
            tier: AuthTier.TIER_2,
            message: "Identity verified successfully.",
        };
    }
    async verifyKYC(phone, nin, photoBase64) {
        console.log('[auth.service::verifyKYC] ENTER', { phone, ninLength: nin?.length, hasPhoto: !!photoBase64 });
        // Verify NIN with biometric if photo provided
        let result;
        if (photoBase64) {
            console.log('[auth.service::verifyKYC] branch: with biometric');
            result = await nimcService.verifyNINWithBiometric(nin, photoBase64);
        }
        else {
            console.log('[auth.service::verifyKYC] branch: without biometric');
            result = await nimcService.verifyNIN(nin);
        }
        if (!result.success || !result.data?.is_valid) {
            console.log('[auth.service::verifyKYC] branch: KYC invalid');
            console.log('[auth.service::verifyKYC] EXIT', { success: false });
            return {
                success: false,
                tier: 2,
                message: "KYC verification failed. Please try again or type AGENT for help.",
            };
        }
        console.log('[auth.service::verifyKYC] branch: KYC valid, updating taxpayer');
        // Update taxpayer with KYC data
        await Taxpayer.findOneAndUpdate({ phone }, {
            nin,
            is_verified: true,
            verification_date: new Date(),
            auth_tier: AuthTier.TIER_3,
        });
        console.log('[auth.service::verifyKYC] branch: upgrading session to TIER_3');
        // Upgrade to Tier 3
        await sessionService.upgradeSession(phone, AuthTier.TIER_3);
        console.log('[auth.service::verifyKYC] EXIT', { success: true, tier: AuthTier.TIER_3 });
        return {
            success: true,
            tier: AuthTier.TIER_3,
            message: "Full identity verification complete.",
        };
    }
    async checkAuthForFlow(phone, flowName) {
        console.log('[auth.service::checkAuthForFlow] ENTER', { phone, flowName });
        const requiredTier = this.getRequiredTierForFlow(flowName);
        const currentTier = await sessionService.getSessionTier(phone);
        const result = {
            authorized: currentTier >= requiredTier,
            currentTier,
            requiredTier,
        };
        console.log('[auth.service::checkAuthForFlow] EXIT', result);
        return result;
    }
}
export default new AuthService();
