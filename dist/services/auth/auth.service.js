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
        return TIER_REQUIREMENTS[tier] ?? TIER_REQUIREMENTS[0];
    }
    getRequiredTierForFlow(flowName) {
        return FLOW_AUTH_MAP[flowName] ?? 0;
    }
    async initiateAuth(phone, requiredTier) {
        // Check existing session
        const currentTier = await sessionService.getSessionTier(phone);
        if (currentTier >= requiredTier) {
            return {
                success: true,
                tier: currentTier,
                message: "Already authenticated at required level.",
            };
        }
        const requirements = this.getTierRequirements(requiredTier);
        // Determine next step needed
        if (requirements.requires_tin && currentTier < AuthTier.TIER_1) {
            return {
                success: false,
                tier: currentTier,
                message: "Please enter your TIN (Tax Identification Number).",
                requires_next: "tin",
            };
        }
        if (requirements.requires_otp && currentTier < AuthTier.TIER_1) {
            return {
                success: false,
                tier: currentTier,
                message: "OTP verification required.",
                requires_next: "otp",
            };
        }
        if (requirements.requires_nin_or_bvn && currentTier < AuthTier.TIER_2) {
            return {
                success: false,
                tier: currentTier,
                message: "Please provide your NIN or BVN for identity verification.",
                requires_next: "nin_bvn",
            };
        }
        if (requirements.requires_kyc && currentTier < AuthTier.TIER_3) {
            return {
                success: false,
                tier: currentTier,
                message: "Full KYC verification is required. Please provide your NIN and a photo of a valid ID.",
                requires_next: "kyc",
            };
        }
        return {
            success: true,
            tier: currentTier,
            message: "Authentication complete.",
        };
    }
    async verifyTIN(phone, tin) {
        const result = await jtbService.verifyTIN(tin);
        if (!result.success || !result.data) {
            return {
                success: false,
                tier: 0,
                message: "TIN verification failed. Please check your TIN and try again.",
            };
        }
        // Update taxpayer record
        await Taxpayer.findOneAndUpdate({ phone }, {
            tin,
            first_name: result.data.first_name,
            last_name: result.data.last_name,
            last_interaction: new Date(),
        }, { upsert: true });
        // Send OTP to registered phone
        const otpResult = await otpService.sendOTP(phone);
        return {
            success: true,
            tier: 0,
            message: `TIN verified. ${otpResult.message}. Please enter the 6-digit code.`,
            requires_next: "otp",
        };
    }
    async verifyOTP(phone, code) {
        const otpResult = await otpService.verifyOTP(phone, code);
        if (!otpResult.valid) {
            return {
                success: false,
                tier: 0,
                message: otpResult.message,
            };
        }
        // Create or upgrade session to Tier 1
        const session = await sessionService.createSession(phone, AuthTier.TIER_1);
        // Update taxpayer
        const taxpayer = await Taxpayer.findOne({ phone });
        const name = [taxpayer?.first_name, taxpayer?.last_name]
            .filter(Boolean)
            .join(" ");
        return {
            success: true,
            tier: AuthTier.TIER_1,
            session_id: String(session._id),
            message: `Verified. Welcome back${name ? `, ${name}` : ""}. Your session is active.`,
        };
    }
    async verifyIdentity(phone, type, value) {
        if (type === "nin") {
            const result = await nimcService.verifyNIN(value);
            if (!result.success || !result.data?.is_valid) {
                return {
                    success: false,
                    tier: 1,
                    message: "NIN verification failed. Please check and try again.",
                };
            }
            await Taxpayer.findOneAndUpdate({ phone }, { nin: value });
        }
        else {
            const result = await nibssService.verifyBVN(value);
            if (!result.success || !result.data?.is_valid) {
                return {
                    success: false,
                    tier: 1,
                    message: "BVN verification failed. Please check and try again.",
                };
            }
            await Taxpayer.findOneAndUpdate({ phone }, { bvn: value });
        }
        // Upgrade to Tier 2
        await sessionService.upgradeSession(phone, AuthTier.TIER_2);
        return {
            success: true,
            tier: AuthTier.TIER_2,
            message: "Identity verified successfully.",
        };
    }
    async verifyKYC(phone, nin, photoBase64) {
        // Verify NIN with biometric if photo provided
        const result = photoBase64
            ? await nimcService.verifyNINWithBiometric(nin, photoBase64)
            : await nimcService.verifyNIN(nin);
        if (!result.success || !result.data?.is_valid) {
            return {
                success: false,
                tier: 2,
                message: "KYC verification failed. Please try again or type AGENT for help.",
            };
        }
        // Update taxpayer with KYC data
        await Taxpayer.findOneAndUpdate({ phone }, {
            nin,
            is_verified: true,
            verification_date: new Date(),
            auth_tier: AuthTier.TIER_3,
        });
        // Upgrade to Tier 3
        await sessionService.upgradeSession(phone, AuthTier.TIER_3);
        return {
            success: true,
            tier: AuthTier.TIER_3,
            message: "Full identity verification complete.",
        };
    }
    async checkAuthForFlow(phone, flowName) {
        const requiredTier = this.getRequiredTierForFlow(flowName);
        const currentTier = await sessionService.getSessionTier(phone);
        return {
            authorized: currentTier >= requiredTier,
            currentTier,
            requiredTier,
        };
    }
}
export default new AuthService();
