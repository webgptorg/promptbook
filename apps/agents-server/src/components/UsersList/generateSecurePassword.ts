/**
 * Configuration for a generated password.
 *
 * @private utility of <PasswordGeneratorDialog/>
 */
export type PasswordGeneratorOptions = {
    readonly length: number;
    readonly isUppercaseLettersIncluded: boolean;
    readonly isLowercaseLettersIncluded: boolean;
    readonly isNumbersIncluded: boolean;
    readonly isSpecialCharactersIncluded: boolean;
};

/**
 * Names of the configurable character categories.
 *
 * @private utility of <PasswordGeneratorDialog/>
 */
export type PasswordCharacterOptionName = Exclude<keyof PasswordGeneratorOptions, 'length'>;

/**
 * Default configuration for securely generated passwords.
 *
 * @private utility of <PasswordGeneratorDialog/>
 */
export const DEFAULT_PASSWORD_GENERATOR_OPTIONS: PasswordGeneratorOptions = {
    length: 16,
    isUppercaseLettersIncluded: true,
    isLowercaseLettersIncluded: true,
    isNumbersIncluded: true,
    isSpecialCharactersIncluded: true,
};

/**
 * Character categories that can be included in a generated password.
 *
 * @private utility of <PasswordGeneratorDialog/>
 */
export const PASSWORD_CHARACTER_OPTION_NAMES: ReadonlyArray<PasswordCharacterOptionName> = [
    'isUppercaseLettersIncluded',
    'isLowercaseLettersIncluded',
    'isNumbersIncluded',
    'isSpecialCharactersIncluded',
];

/**
 * Character sets used for the configurable password categories.
 */
const PASSWORD_CHARACTERS_BY_OPTION_NAME: Readonly<Record<PasswordCharacterOptionName, string>> = {
    isUppercaseLettersIncluded: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
    isLowercaseLettersIncluded: 'abcdefghijkmnopqrstuvwxyz',
    isNumbersIncluded: '23456789',
    isSpecialCharactersIncluded: '!@#$%^&*+-_=~',
};

/**
 * Obtains one unbiased random index from a character set using the browser Web Crypto API.
 *
 * @private utility of generateSecurePassword
 */
function getSecureRandomIndex(secureRandomSource: Crypto, characterCount: number): number {
    const largestAcceptableRandomValue = Math.floor(0x1_0000_0000 / characterCount) * characterCount;
    const randomValues = new Uint32Array(1);

    let randomValue: number | undefined;

    do {
        secureRandomSource.getRandomValues(randomValues);
        randomValue = randomValues[0];
    } while (randomValue === undefined || randomValue >= largestAcceptableRandomValue);

    return randomValue % characterCount;
}

/**
 * Randomly reorders password characters with the Fisher-Yates algorithm.
 *
 * @private utility of generateSecurePassword
 */
function shufflePasswordCharacters(passwordCharacters: Array<string>, secureRandomSource: Crypto): void {
    for (let index = passwordCharacters.length - 1; index > 0; index--) {
        const randomIndex = getSecureRandomIndex(secureRandomSource, index + 1);
        const currentPasswordCharacter = passwordCharacters[index];
        const randomPasswordCharacter = passwordCharacters[randomIndex];

        if (currentPasswordCharacter === undefined || randomPasswordCharacter === undefined) {
            continue;
        }

        passwordCharacters[index] = randomPasswordCharacter;
        passwordCharacters[randomIndex] = currentPasswordCharacter;
    }
}

/**
 * Generates a password using the browser Web Crypto API.
 *
 * Rejection sampling keeps every selected character equally likely even when
 * the character-set length is not a power of two. Every selected character
 * category is guaranteed to occur at least once.
 *
 * @param options - Length and character categories to use for the password.
 * @returns A cryptographically random password, or an empty string when the configuration is invalid or a secure random source is unavailable.
 *
 * @private utility of <PasswordGeneratorDialog/>
 */
export function generateSecurePassword(options: PasswordGeneratorOptions = DEFAULT_PASSWORD_GENERATOR_OPTIONS): string {
    const secureRandomSource = globalThis.crypto;

    if (!secureRandomSource?.getRandomValues) {
        return '';
    }

    const characterSets = PASSWORD_CHARACTER_OPTION_NAMES.filter((optionName) => options[optionName]).map(
        (optionName) => PASSWORD_CHARACTERS_BY_OPTION_NAME[optionName],
    );

    if (!Number.isSafeInteger(options.length) || options.length < characterSets.length || characterSets.length === 0) {
        return '';
    }

    const allPasswordCharacters = characterSets.join('');
    const passwordCharacters: Array<string> = [];

    for (const characterSet of characterSets) {
        passwordCharacters.push(characterSet.charAt(getSecureRandomIndex(secureRandomSource, characterSet.length)));
    }

    while (passwordCharacters.length < options.length) {
        passwordCharacters.push(
            allPasswordCharacters.charAt(getSecureRandomIndex(secureRandomSource, allPasswordCharacters.length)),
        );
    }

    shufflePasswordCharacters(passwordCharacters, secureRandomSource);

    return passwordCharacters.join('');
}
