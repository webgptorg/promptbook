import { timingSafeEqual } from 'crypto';

/**
 * Compares a candidate string against the `ADMIN_PASSWORD` environment variable
 * using a constant-time algorithm to prevent timing attacks.
 *
 * Returning `false` early when the byte lengths differ does not expose character
 * content — only length — which is an acceptable trade-off, since `timingSafeEqual`
 * requires equal-length buffers and length is typically not secret.
 *
 * @param candidate The value to compare against the configured admin password.
 * @returns `true` when `candidate` matches `ADMIN_PASSWORD`, `false` otherwise.
 */
export function isAdminPasswordEqual(candidate: string): boolean {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
        return false;
    }

    const candidateBuffer = Buffer.from(candidate);
    const adminPasswordBuffer = Buffer.from(adminPassword);

    if (candidateBuffer.length !== adminPasswordBuffer.length) {
        return false;
    }

    return timingSafeEqual(candidateBuffer, adminPasswordBuffer);
}
