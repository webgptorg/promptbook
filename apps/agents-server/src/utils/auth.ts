import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

/**
 * Hashes a password using scrypt
 * 
 * @param password The plain text password
 * @returns The salt and hash formatted as "salt:hash"
 */
export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verifies a password against a stored hash
 * 
 * @param password The plain text password
 * @param storedHash The stored hash in format "salt:hash"
 * @returns True if the password matches
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    const keyBuffer = Buffer.from(key, 'hex');
    
    return timingSafeEqual(derivedKey, keyBuffer);
}
