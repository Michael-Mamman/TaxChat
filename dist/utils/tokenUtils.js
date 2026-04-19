/**
 * Checks if a token has expired or will expire within buffer time
 */
export function isTokenExpired(expiresAt, bufferSeconds = 7200) {
    if (!expiresAt) {
        return true;
    }
    const expirationDate = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
    if (isNaN(expirationDate.getTime())) {
        return true;
    }
    const now = new Date();
    const bufferTime = new Date(expirationDate.getTime() - bufferSeconds * 1000);
    return now >= bufferTime;
}
/**
 * Gets the time remaining until token expiration in seconds
 */
export function getTokenTimeRemaining(expiresAt) {
    if (!expiresAt) {
        return 0;
    }
    const expirationDate = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
    if (isNaN(expirationDate.getTime())) {
        return 0;
    }
    const now = new Date();
    const remainingMs = expirationDate.getTime() - now.getTime();
    return Math.max(0, Math.floor(remainingMs / 1000));
}
/**
 * Checks if a token will expire soon
 */
export function isTokenExpiringSoon(expiresAt, bufferSeconds = 300) {
    const remainingSeconds = getTokenTimeRemaining(expiresAt);
    return remainingSeconds > 0 && remainingSeconds <= bufferSeconds;
}
