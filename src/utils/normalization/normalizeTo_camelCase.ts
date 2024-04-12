/* tslint:disable */
/* TODO: Enable TSLint */

export function normalizeTo_camelCase(
    sentence: string,
    __firstLetterCapital = false,
): string {
    let charType: char_type;
    let lastCharType: char_type | null = null;

    let normalizedName = '';

    for (const char of sentence) {
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
            if (__firstLetterCapital) {
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

type char_type = 'LOWERCASE' | 'UPPERCASE' | 'NUMBER' | 'OTHER';

/**
 * TODO: [🌺] Use some intermediate util splitWords
 */
