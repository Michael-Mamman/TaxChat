/**
 * Checks if a token has expired or will expire within buffer time
 */
export function isTokenExpired(expiresAt, bufferSeconds = 7200) {
    console.log('[tokenUtils::isTokenExpired] ENTER', { hasExpiresAt: !!expiresAt, bufferSeconds, expiresAtType: typeof expiresAt });
    if (!expiresAt) {
        console.log('[tokenUtils::isTokenExpired] branch: no expiresAt provided');
        console.log('[tokenUtils::isTokenExpired] EXIT', { result: true });
        return true;
    }
    const expirationDate = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
    if (typeof expiresAt === "string") {
        console.log('[tokenUtils::isTokenExpired] branch: expiresAt is string, converted to Date');
    }
    else {
        console.log('[tokenUtils::isTokenExpired] branch: expiresAt is Date');
    }
    if (isNaN(expirationDate.getTime())) {
        console.log('[tokenUtils::isTokenExpired] branch: invalid expiration date');
        console.log('[tokenUtils::isTokenExpired] EXIT', { result: true });
        return true;
    }
    console.log('[tokenUtils::isTokenExpired] branch: valid expiration date');
    const now = new Date();
    const bufferTime = new Date(expirationDate.getTime() - bufferSeconds * 1000);
    const result = now >= bufferTime;
    console.log('[tokenUtils::isTokenExpired] EXIT', { result });
    return result;
}
/**
 * Gets the time remaining until token expiration in seconds
 */
export function getTokenTimeRemaining(expiresAt) {
    console.log('[tokenUtils::getTokenTimeRemaining] ENTER', { hasExpiresAt: !!expiresAt, expiresAtType: typeof expiresAt });
    if (!expiresAt) {
        console.log('[tokenUtils::getTokenTimeRemaining] branch: no expiresAt provided');
        console.log('[tokenUtils::getTokenTimeRemaining] EXIT', { result: 0 });
        return 0;
    }
    const expirationDate = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
    if (typeof expiresAt === "string") {
        console.log('[tokenUtils::getTokenTimeRemaining] branch: expiresAt is string, converted to Date');
    }
    else {
        console.log('[tokenUtils::getTokenTimeRemaining] branch: expiresAt is Date');
    }
    if (isNaN(expirationDate.getTime())) {
        console.log('[tokenUtils::getTokenTimeRemaining] branch: invalid expiration date');
        console.log('[tokenUtils::getTokenTimeRemaining] EXIT', { result: 0 });
        return 0;
    }
    console.log('[tokenUtils::getTokenTimeRemaining] branch: valid expiration date');
    const now = new Date();
    const remainingMs = expirationDate.getTime() - now.getTime();
    const result = Math.max(0, Math.floor(remainingMs / 1000));
    console.log('[tokenUtils::getTokenTimeRemaining] EXIT', { result });
    return result;
}
/**
 * Checks if a token will expire soon
 */
export function isTokenExpiringSoon(expiresAt, bufferSeconds = 300) {
    console.log('[tokenUtils::isTokenExpiringSoon] ENTER', { hasExpiresAt: !!expiresAt, bufferSeconds });
    const remainingSeconds = getTokenTimeRemaining(expiresAt);
    if (remainingSeconds > 0 && remainingSeconds <= bufferSeconds) {
        console.log('[tokenUtils::isTokenExpiringSoon] branch: token expiring within buffer');
    }
    else {
        console.log('[tokenUtils::isTokenExpiringSoon] branch: token not expiring soon');
    }
    const result = remainingSeconds > 0 && remainingSeconds <= bufferSeconds;
    console.log('[tokenUtils::isTokenExpiringSoon] EXIT', { result, remainingSeconds });
    return result;
}
