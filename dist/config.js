import dotenv from "dotenv";
dotenv.config();
console.log('[config::module] ENTER - loading env');
// === Server ===
export const NODE_ENV = process.env.NODE_ENV;
export const PORT = process.env.PORT || 3000;
export const MONGO_URI = process.env.MONGO_URI;
// === WhatsApp Business API ===
export const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
export const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
export const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
export const APP_SECRET = process.env.APP_SECRET;
export const PASSPHRASE = process.env.PASSPHRASE;
// === TaxChat Flow IDs ===
export const FLOW_IDS = {
    TIN_REGISTRATION: process.env.TIN_REGISTRATION_FLOW || "",
    TIN_RETRIEVAL: process.env.TIN_RETRIEVAL_FLOW || "",
    TAX_CLEARANCE: process.env.TAX_CLEARANCE_FLOW || "",
    PAYMENT_CONFIRMATION: process.env.PAYMENT_CONFIRMATION_FLOW || "",
    PROFILE_UPDATE: process.env.PROFILE_UPDATE_FLOW || "",
    FILING_SUPPORT: process.env.FILING_SUPPORT_FLOW || "",
    ASSESSMENT_QUERY: process.env.ASSESSMENT_QUERY_FLOW || "",
    PENALTY_QUERY: process.env.PENALTY_QUERY_FLOW || "",
    WHT_CREDIT_NOTE: process.env.WHT_CREDIT_NOTE_FLOW || "",
    GENERAL_ENQUIRY: process.env.GENERAL_ENQUIRY_FLOW || "",
};
console.log('[config::module] FLOW_IDS loaded', { count: Object.keys(FLOW_IDS).length });
// === External Integration URLs ===
export const ITSM_BASE_URL = process.env.ITSM_BASE_URL || "";
export const ITSM_API_KEY = process.env.ITSM_API_KEY || "";
export const TAXPROMAX_BASE_URL = process.env.TAXPROMAX_BASE_URL || "";
export const TAXPROMAX_API_KEY = process.env.TAXPROMAX_API_KEY || "";
export const JTB_BASE_URL = process.env.JTB_BASE_URL || "";
export const JTB_API_KEY = process.env.JTB_API_KEY || "";
export const REMITA_BASE_URL = process.env.REMITA_BASE_URL || "";
export const REMITA_MERCHANT_ID = process.env.REMITA_MERCHANT_ID || "";
export const REMITA_API_KEY = process.env.REMITA_API_KEY || "";
export const NIMC_BASE_URL = process.env.NIMC_BASE_URL || "";
export const NIMC_API_KEY = process.env.NIMC_API_KEY || "";
export const NIBSS_BASE_URL = process.env.NIBSS_BASE_URL || "";
export const NIBSS_API_KEY = process.env.NIBSS_API_KEY || "";
export const SMS_GATEWAY_URL = process.env.SMS_GATEWAY_URL || "";
export const SMS_API_KEY = process.env.SMS_API_KEY || "";
export const AKRAA_AI_URL = process.env.AKRAA_AI_URL || "";
export const AKRAA_AI_API_KEY = process.env.AKRAA_AI_API_KEY || "";
export const TAXLY_BASE_URL = process.env.TAXLY_BASE_URL || "";
export const TAXLY_API_KEY = process.env.TAXLY_API_KEY || "";
export const CIN_BASE_URL = process.env.CIN_BASE_URL || "";
export const CIN_API_KEY = process.env.CIN_API_KEY || "";
// === Email ===
export const EMAIL_SERVICE_URL = process.env.EMAIL_SERVICE_URL || "";
// === Auth ===
export const OTP_EXPIRY_SECONDS = Number(process.env.OTP_EXPIRY_SECONDS) || 300;
export const SESSION_TIMEOUT_SECONDS = Number(process.env.SESSION_TIMEOUT_SECONDS) || 900;
export const MAX_OTP_ATTEMPTS = Number(process.env.MAX_OTP_ATTEMPTS) || 3;
// === Logging ===
const LOG_ALL_SECRETS = process.env.NODE_ENV === "development";
if (LOG_ALL_SECRETS) {
    console.log('[config::module] branch: development - logging non-secret values');
    console.log("[config] loaded:", { NODE_ENV, PORT, PHONE_NUMBER_ID });
}
else {
    console.log('[config::module] branch: non-development - logging presence only');
    console.log("[config] secrets_present:", {
        NODE_ENV: Boolean(NODE_ENV),
        PORT: Boolean(PORT),
        WHATSAPP_TOKEN: Boolean(WHATSAPP_TOKEN),
        PHONE_NUMBER_ID: Boolean(PHONE_NUMBER_ID),
        MONGO_URI: Boolean(MONGO_URI),
    });
}
console.log('[config::module] EXIT - config module loaded');
