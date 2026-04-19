/** Nigerian TIN: typically 10+ digits, may include hyphens */
export function isValidTIN(tin) {
    console.log('[validators::isValidTIN] ENTER', { tinLength: tin?.length });
    const cleaned = tin.replace(/[-\s]/g, "");
    const result = /^\d{8,}$/.test(cleaned);
    console.log('[validators::isValidTIN] EXIT', { result, cleanedLength: cleaned.length });
    return result;
}
/** NIN: 11-digit numeric */
export function isValidNIN(nin) {
    console.log('[validators::isValidNIN] ENTER', { ninLength: nin?.length });
    const result = /^\d{11}$/.test(nin.trim());
    console.log('[validators::isValidNIN] EXIT', { result });
    return result;
}
/** BVN: 11-digit numeric */
export function isValidBVN(bvn) {
    console.log('[validators::isValidBVN] ENTER', { bvnLength: bvn?.length });
    const result = /^\d{11}$/.test(bvn.trim());
    console.log('[validators::isValidBVN] EXIT', { result });
    return result;
}
/** Nigerian phone: 234XXXXXXXXXX or 0XXXXXXXXXXX */
export function isValidNigerianPhone(phone) {
    console.log('[validators::isValidNigerianPhone] ENTER', { phoneLength: phone?.length });
    const cleaned = phone.replace(/[^0-9]/g, "");
    const result = /^234\d{10}$/.test(cleaned) || /^0\d{10}$/.test(cleaned);
    if (/^234\d{10}$/.test(cleaned)) {
        console.log('[validators::isValidNigerianPhone] branch: matches 234 prefix pattern');
    }
    else if (/^0\d{10}$/.test(cleaned)) {
        console.log('[validators::isValidNigerianPhone] branch: matches 0 prefix pattern');
    }
    else {
        console.log('[validators::isValidNigerianPhone] branch: no pattern matched');
    }
    console.log('[validators::isValidNigerianPhone] EXIT', { result, cleanedLength: cleaned.length });
    return result;
}
/** Normalize phone to digits only (234 prefix) */
export function normalizePhone(phone) {
    console.log('[validators::normalizePhone] ENTER', { phoneLength: phone?.length });
    let cleaned = phone.replace(/[^0-9]/g, "");
    if (cleaned.startsWith("0") && cleaned.length === 11) {
        console.log('[validators::normalizePhone] branch: converting 0 prefix to 234');
        cleaned = "234" + cleaned.slice(1);
    }
    else {
        console.log('[validators::normalizePhone] branch: no conversion needed');
    }
    console.log('[validators::normalizePhone] EXIT', { cleanedLength: cleaned.length });
    return cleaned;
}
/** Mask sensitive identifiers: "12345678-0001" -> "****5678-0001" */
export function maskTIN(tin) {
    console.log('[validators::maskTIN] ENTER', { tinLength: tin?.length });
    if (tin.length <= 4) {
        console.log('[validators::maskTIN] branch: tin too short, fully masked');
        console.log('[validators::maskTIN] EXIT', { masked: true });
        return "****";
    }
    console.log('[validators::maskTIN] branch: standard masking');
    const result = "****" + tin.slice(-5);
    console.log('[validators::maskTIN] EXIT', { maskedLength: result.length });
    return result;
}
/** Mask phone: "08034561234" -> "0803***1234" */
export function maskPhone(phone) {
    console.log('[validators::maskPhone] ENTER', { phoneLength: phone?.length });
    if (phone.length <= 7) {
        console.log('[validators::maskPhone] branch: phone too short, returning as-is');
        console.log('[validators::maskPhone] EXIT', { unchanged: true });
        return phone;
    }
    console.log('[validators::maskPhone] branch: standard masking');
    const result = phone.slice(0, 4) + "***" + phone.slice(-4);
    console.log('[validators::maskPhone] EXIT', { maskedLength: result.length });
    return result;
}
/** Mask email: "adekunle@gmail.com" -> "a***@gmail.com" */
export function maskEmail(email) {
    console.log('[validators::maskEmail] ENTER', { emailLength: email?.length });
    const [local, domain] = email.split("@");
    if (!local || !domain) {
        console.log('[validators::maskEmail] branch: invalid email format, returning as-is');
        console.log('[validators::maskEmail] EXIT', { unchanged: true });
        return email;
    }
    console.log('[validators::maskEmail] branch: valid email format, masking');
    const result = local.charAt(0) + "***@" + domain;
    console.log('[validators::maskEmail] EXIT', { maskedLength: result.length });
    return result;
}
/** Validate email format */
export function isValidEmail(email) {
    console.log('[validators::isValidEmail] ENTER', { emailLength: email?.length });
    const result = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    console.log('[validators::isValidEmail] EXIT', { result });
    return result;
}
