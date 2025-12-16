import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { PASSWORD_SECURITY_CONFIG, SCRYPT_OPTIONS } from '../../../../security.config';

const scryptAsync = promisify(scrypt);

/**
 * Validates password input to prevent edge cases and DoS attacks
 *
 * @param password The password to validate
 * @throws Error if password is invalid
 */
function validatePasswordInput(password: string): void {
    if (typeof password !== 'string') {
        throw new Error('Password must be a string');
    }
    if (password.length === 0) {
        throw new Error('Password cannot be empty');
    }
    if (password.length < PASSWORD_SECURITY_CONFIG.MIN_PASSWORD_LENGTH) {
        throw new Error(`Password must be at least ${PASSWORD_SECURITY_CONFIG.MIN_PASSWORD_LENGTH} characters`);
    }
    if (password.length > PASSWORD_SECURITY_CONFIG.MAX_PASSWORD_LENGTH) {
        throw new Error(`Password cannot exceed ${PASSWORD_SECURITY_CONFIG.MAX_PASSWORD_LENGTH} characters`);
    }
}

/**
 * Hashes a password using scrypt with secure parameters
 *
 * @param password The plain text password (8-1024 characters)
 * @returns The salt and hash formatted as "salt:hash"
 * @throws Error if password validation fails
 */
export async function hashPassword(password: string): Promise<string> {
    validatePasswordInput(password);

    const salt = randomBytes(PASSWORD_SECURITY_CONFIG.SALT_LENGTH).toString('hex');
    const derivedKey = (await scryptAsync(
        password,
        salt,
        PASSWORD_SECURITY_CONFIG.KEY_LENGTH,
        SCRYPT_OPTIONS,
    )) as Buffer;

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

    if (password.length === 0 || password.length > PASSWORD_SECURITY_CONFIG.MAX_PASSWORD_LENGTH) {
        return false;
    }

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
        const derivedKey = (await scryptAsync(
            password,
            salt,
            PASSWORD_SECURITY_CONFIG.KEY_LENGTH,
            SCRYPT_OPTIONS,
        )) as Buffer;
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
