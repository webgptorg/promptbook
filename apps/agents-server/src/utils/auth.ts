import { createHash, randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { PASSWORD_SECURITY_CONFIG } from '../../../../security.config';

const scryptAsync = promisify(scrypt);

/**
 * Error thrown when a password does not meet the security requirements.
 *
 * @private Signals to callers that the failure was caused by invalid password input.
 */
export class PasswordValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PasswordValidationError';
    }
}

/**
 * Type guard for password validation failures.
 *
 * @private Ensures callers can safely inspect validation error details.
 */
export function isPasswordValidationError(error: unknown): error is PasswordValidationError {
    return error instanceof PasswordValidationError;
}

/**
 * If the error represents a password validation failure, return its user-facing message.
 *
 * @private Used by API routes to decide whether a descriptive error should be returned to the client.
 */
export function getPasswordValidationMessage(error: unknown): string | null {
    if (isPasswordValidationError(error)) {
        return error.message;
    }
    return null;
}

/**
 * Validates password input to prevent edge cases and DoS attacks
 *
 * @param password The password to validate
 * @throws Error if password is invalid
 */
function validatePasswordInput(password: string): void {
    if (typeof password !== 'string') {
        throw new PasswordValidationError('Password must be a string');
    }
    if (password.length === 0) {
        throw new PasswordValidationError('Password cannot be empty');
    }
    if (password.length < PASSWORD_SECURITY_CONFIG.MIN_PASSWORD_LENGTH) {
        throw new PasswordValidationError(
            `Password must be at least ${PASSWORD_SECURITY_CONFIG.MIN_PASSWORD_LENGTH} characters`,
        );
    }
    // Note: No hard max limit - long passwords are compacted via compactPassword()
}

/**
 * Compacts a password for secure processing
 *
 * If the password is within MAX_PASSWORD_LENGTH, it is returned as-is.
 * If longer, the password is split at MAX_PASSWORD_LENGTH and the second part
 * is hashed with SHA256 before being appended to the first part.
 *
 * This prevents DoS attacks via extremely long passwords while still utilizing
 * the full entropy of longer passwords.
 *
 * @param password The password to compact
 * @returns The compacted password
 */
function compactPassword(password: string): string {
    if (password.length <= PASSWORD_SECURITY_CONFIG.MAX_PASSWORD_LENGTH) {
        return password;
    }

    const firstPart = password.slice(0, PASSWORD_SECURITY_CONFIG.MAX_PASSWORD_LENGTH);
    const secondPart = password.slice(PASSWORD_SECURITY_CONFIG.MAX_PASSWORD_LENGTH);

    // Hash the overflow part with SHA256 to bound its length while preserving entropy
    const secondPartHash = createHash('sha256').update(secondPart, 'utf8').digest('hex');

    return firstPart + secondPartHash;
}

/**
 * Hashes a password using scrypt with secure parameters
 *
 * @param password The plain text password (minimum 8 characters, no maximum - long passwords are compacted)
 * @returns The salt and hash formatted as "salt:hash"
 * @throws Error if password validation fails
 */
export async function hashPassword(password: string): Promise<string> {
    validatePasswordInput(password);

    // Compact long passwords to prevent DoS while preserving entropy
    const compactedPassword = compactPassword(password);

    const salt = randomBytes(PASSWORD_SECURITY_CONFIG.SALT_LENGTH).toString('hex');
    const derivedKey = (await scryptAsync(compactedPassword, salt, PASSWORD_SECURITY_CONFIG.KEY_LENGTH)) as Buffer;

    // Clear password from memory as soon as possible (best effort)
    // Note: JavaScript strings are immutable, so this is limited in effectiveness
    return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verifies a password against a stored hash using constant-time comparison
 *
 * @param password The plain text password to verify
 * @param storedHash The stored hash in format "salt:hash"
 * @returns True if the password matches, false otherwise
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    // Validate inputs
    if (typeof password !== 'string' || typeof storedHash !== 'string') {
        return false;
    }

    if (password.length === 0) {
        return false;
    }

    // Compact long passwords the same way as during hashing
    const compactedPassword = compactPassword(password);

    const parts = storedHash.split(':');
    if (parts.length !== 2) {
        return false;
    }

    const [salt, key] = parts;
    if (!salt || !key) {
        return false;
    }

    // Validate salt and key format (should be hex strings of expected length)
    const expectedSaltLength = PASSWORD_SECURITY_CONFIG.SALT_LENGTH * 2; // hex encoding doubles length
    const expectedKeyLength = PASSWORD_SECURITY_CONFIG.KEY_LENGTH * 2;

    if (salt.length !== expectedSaltLength || key.length !== expectedKeyLength) {
        return false;
    }

    // Validate hex format
    const hexRegex = /^[0-9a-fA-F]+$/;
    if (!hexRegex.test(salt) || !hexRegex.test(key)) {
        return false;
    }

    try {
        const derivedKey = (await scryptAsync(compactedPassword, salt, PASSWORD_SECURITY_CONFIG.KEY_LENGTH)) as Buffer;
        const keyBuffer = Buffer.from(key, 'hex');

        // Ensure buffers are same length before timing-safe comparison
        // This should always be true given our validation, but defense in depth
        if (derivedKey.length !== keyBuffer.length) {
            return false;
        }

        return timingSafeEqual(derivedKey, keyBuffer);
    } catch {
        // Any error during verification should return false, not leak information
        return false;
    }
}
