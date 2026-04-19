/** Nigerian TIN: typically 10+ digits, may include hyphens */
export function isValidTIN(tin) {
    const cleaned = tin.replace(/[-\s]/g, "");
    return /^\d{8,}$/.test(cleaned);
}
/** NIN: 11-digit numeric */
export function isValidNIN(nin) {
    return /^\d{11}$/.test(nin.trim());
}
/** BVN: 11-digit numeric */
export function isValidBVN(bvn) {
    return /^\d{11}$/.test(bvn.trim());
}
/** Nigerian phone: 234XXXXXXXXXX or 0XXXXXXXXXXX */
export function isValidNigerianPhone(phone) {
    const cleaned = phone.replace(/[^0-9]/g, "");
    return /^234\d{10}$/.test(cleaned) || /^0\d{10}$/.test(cleaned);
}
/** Normalize phone to digits only (234 prefix) */
export function normalizePhone(phone) {
    let cleaned = phone.replace(/[^0-9]/g, "");
    if (cleaned.startsWith("0") && cleaned.length === 11) {
        cleaned = "234" + cleaned.slice(1);
    }
    return cleaned;
}
/** Mask sensitive identifiers: "12345678-0001" -> "****5678-0001" */
export function maskTIN(tin) {
    if (tin.length <= 4)
        return "****";
    return "****" + tin.slice(-5);
}
/** Mask phone: "08034561234" -> "0803***1234" */
export function maskPhone(phone) {
    if (phone.length <= 7)
        return phone;
    return phone.slice(0, 4) + "***" + phone.slice(-4);
}
/** Mask email: "adekunle@gmail.com" -> "a***@gmail.com" */
export function maskEmail(email) {
    const [local, domain] = email.split("@");
    if (!local || !domain)
        return email;
    return local.charAt(0) + "***@" + domain;
}
/** Validate email format */
export function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
