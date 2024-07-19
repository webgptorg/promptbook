/**
 * Semantic helper for camelCase strings
 *
 * @example 'helloWorld'
 * @example 'iLovePromptbook'
 */
export type string_camelCase = string;

/**
 * @private type of `normalizeTo_camelCase`
 */
type char_type = 'LOWERCASE' | 'UPPERCASE' | 'NUMBER' | 'OTHER';

export function normalizeTo_camelCase(text: string, _isFirstLetterCapital = false): string_camelCase {
    let charType: char_type;
    let lastCharType: char_type | null = null;

    let normalizedName = '';

    for (const char of text) {
        let normalizedChar: string;

        if (/^[a-z]$/.test(char)) {
            charType = 'LOWERCASE';
            normalizedChar = char;
        } else if (/^[A-Z]$/.test(char)) {
            charType = 'UPPERCASE';
            normalizedChar = char.toLowerCase();
        } else if (/^[0-9]$/.test(char)) {
            charType = 'NUMBER';
            normalizedChar = char;
        } else {
            charType = 'OTHER';
            normalizedChar = '';
        }

        if (!lastCharType) {
            if (_isFirstLetterCapital) {
                normalizedChar = normalizedChar.toUpperCase(); //TODO: DRY
            }
        } else if (
            charType !== lastCharType &&
            !(charType === 'LOWERCASE' && lastCharType === 'UPPERCASE') &&
            !(lastCharType === 'NUMBER') &&
            !(charType === 'NUMBER')
        ) {
            normalizedChar = normalizedChar.toUpperCase(); //TODO: [🌺] DRY
        }

        normalizedName += normalizedChar;

        lastCharType = charType;
    }

    return normalizedName;
}

/**
 * TODO: [🌺] Use some intermediate util splitWords
 */
