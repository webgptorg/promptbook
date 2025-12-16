/**
 * Scrypt configuration for maximum security
 * - N: CPU/memory cost parameter (must be power of 2). Higher = more secure but slower
 * - r: Block size parameter. Affects memory and CPU cost
 * - p: Parallelization parameter
 * - maxmem: Maximum memory allowed (in bytes)
 *
 * @public exported from `@promptbook/core`
 */
export const SCRYPT_OPTIONS = {
    N: 32768, // 2^15 - High CPU/memory cost for strong protection against brute-force
    r: 8, // Block size
    p: 2, // Parallelization factor
    maxmem: 256 * 1024 * 1024, // 256 MB max memory
} as const;

/**
 * Password security configuration
 *
 * @public exported from `@promptbook/core`
 */
export const PASSWORD_SECURITY_CONFIG = {
    /**
     * Salt length for scrypt hashing
     *
     * Note: Longer salts provide better security against rainbow table attacks
     */
    SALT_LENGTH: 32,

    /**
     * Derived key length for scrypt hashing
     *
     * Note: Longer keys provide better security
     */
    KEY_LENGTH: 64,

    /**
     * Minimum required password length
     *
     * Note: Enforces basic security standards
     */
    MIN_PASSWORD_LENGTH: 8,

    /**
     * Maximum allowed password length
     *
     * Note: Prevent DoS via extremely long passwords
     */
    MAX_PASSWORD_LENGTH: 1024,
} as const;
