export interface OTPRequest {
  phone: string;
  purpose: "auth" | "verification" | "transaction";
}

export interface OTPVerifyRequest {
  phone: string;
  code: string;
}

export interface AuthResult {
  success: boolean;
  tier: number;
  session_id?: string;
  message: string;
  requires_next?: "tin" | "otp" | "nin_bvn" | "kyc";
}

export interface TierRequirement {
  tier: number;
  requires_tin: boolean;
  requires_otp: boolean;
  requires_nin_or_bvn: boolean;
  requires_kyc: boolean;
}
