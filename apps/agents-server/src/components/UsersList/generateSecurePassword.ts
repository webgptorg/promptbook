/**
 * Default length of passwords generated for new admin users.
 */
const GENERATED_PASSWORD_LENGTH = 20;

/**
 * Characters used by generated passwords.
 */
const GENERATED_PASSWORD_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*+-_=~';

/**
 * Generates a password using the browser Web Crypto API.
 *
 * Rejection sampling keeps every character equally likely even though the
 * alphabet length is not a power of two.
 *
 * @returns A cryptographically random password, or an empty string when a secure random source is unavailable.
 *
 * @private utility of <CreateUserDialog/>
 */
export function generateSecurePassword(): string {
    const secureRandomSource = globalThis.crypto;

    if (!secureRandomSource?.getRandomValues) {
        return '';
    }

    const characterCount = GENERATED_PASSWORD_CHARACTERS.length;
    const largestAcceptableRandomValue = Math.floor(0x1_0000_0000 / characterCount) * characterCount;
    const passwordCharacters: Array<string> = [];
    const randomValues = new Uint32Array(64);

    while (passwordCharacters.length < GENERATED_PASSWORD_LENGTH) {
        secureRandomSource.getRandomValues(randomValues);

        for (const randomValue of randomValues) {
            if (randomValue >= largestAcceptableRandomValue) {
                continue;
            }

            passwordCharacters.push(GENERATED_PASSWORD_CHARACTERS.charAt(randomValue % characterCount));

            if (passwordCharacters.length === GENERATED_PASSWORD_LENGTH) {
                break;
            }
        }
    }

    return passwordCharacters.join('');
}
