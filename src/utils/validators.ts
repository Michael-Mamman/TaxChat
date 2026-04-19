/** Nigerian TIN: typically 10+ digits, may include hyphens */
export function isValidTIN(tin: string): boolean {
  const cleaned = tin.replace(/[-\s]/g, "");
  return /^\d{8,}$/.test(cleaned);
}

/** NIN: 11-digit numeric */
export function isValidNIN(nin: string): boolean {
  return /^\d{11}$/.test(nin.trim());
}

/** BVN: 11-digit numeric */
export function isValidBVN(bvn: string): boolean {
  return /^\d{11}$/.test(bvn.trim());
}

/** Nigerian phone: 234XXXXXXXXXX or 0XXXXXXXXXXX */
export function isValidNigerianPhone(phone: string): boolean {
  const cleaned = phone.replace(/[^0-9]/g, "");
  return /^234\d{10}$/.test(cleaned) || /^0\d{10}$/.test(cleaned);
}

/** Normalize phone to digits only (234 prefix) */
export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = "234" + cleaned.slice(1);
  }
  return cleaned;
}

/** Mask sensitive identifiers: "12345678-0001" -> "****5678-0001" */
export function maskTIN(tin: string): string {
  if (tin.length <= 4) return "****";
  return "****" + tin.slice(-5);
}

/** Mask phone: "08034561234" -> "0803***1234" */
export function maskPhone(phone: string): string {
  if (phone.length <= 7) return phone;
  return phone.slice(0, 4) + "***" + phone.slice(-4);
}

/** Mask email: "adekunle@gmail.com" -> "a***@gmail.com" */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return local.charAt(0) + "***@" + domain;
}

/** Validate email format */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
