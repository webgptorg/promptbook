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
