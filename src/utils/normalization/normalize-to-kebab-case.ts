import { removeDiacritics } from './removeDiacritics';

/**
 * Semantic helper for kebab-case strings
 *
 * @example 'hello-world'
 * @example 'i-love-promptbook'
 */
export type string_kebab_case = string;

/**
 * @private type of `normalizeToKebabCase`
 */
type char_type = 'LOWERCASE' | 'UPPERCASE' | 'NUMBER' | 'SLASH' | 'OTHER';

export function normalizeToKebabCase(text: string): string_kebab_case {
    text = removeDiacritics(text);

    let charType: char_type;
    let lastCharType: char_type = 'OTHER';

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
        } else if (/^\/$/.test(char)) {
            charType = 'SLASH';
            normalizedChar = char;
        } else {
            charType = 'OTHER';
            normalizedChar = '-';
        }

        if (
            charType !== lastCharType &&
            !(lastCharType === 'UPPERCASE' && charType === 'LOWERCASE') &&
            !(lastCharType === 'NUMBER') &&
            !(charType === 'NUMBER')
        ) {
            normalizedName += '-';
        }

        normalizedName += normalizedChar;

        lastCharType = charType;
    }

    normalizedName = normalizedName.split(/-+/g).join('-');
    normalizedName = normalizedName.split(/-?\/-?/g).join('/');
    normalizedName = normalizedName.replace(/^-/, '');
    normalizedName = normalizedName.replace(/-$/, '');

    return normalizedName;
}
