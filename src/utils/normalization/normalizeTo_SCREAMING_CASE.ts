/**
 * Semantic helper for SCREAMING_CASE strings
 *
 * @example 'HELLO_WORLD'
 * @example 'I_LOVE_PROMPTBOOK'
 */
export type string_SCREAMING_CASE = string;

/**
 * @private type of `normalizeTo_SCREAMING_CASE`
 */
type char_type = 'LOWERCASE' | 'UPPERCASE' | 'NUMBER' | 'SLASH' | 'OTHER';

export function normalizeTo_SCREAMING_CASE(text: string): string_SCREAMING_CASE {
    let charType: char_type;
    let lastCharType: char_type = 'OTHER';

    let normalizedName = '';

    for (const char of text) {
        let normalizedChar: string;

        if (/^[a-z]$/.test(char)) {
            charType = 'LOWERCASE';
            normalizedChar = char.toUpperCase();
        } else if (/^[A-Z]$/.test(char)) {
            charType = 'UPPERCASE';
            normalizedChar = char;
        } else if (/^[0-9]$/.test(char)) {
            charType = 'NUMBER';
            normalizedChar = char;
        } else if (/^\/$/.test(char)) {
            charType = 'SLASH';
            normalizedChar = char;
        } else {
            charType = 'OTHER';
            normalizedChar = '_';
        }

        if (
            charType !== lastCharType &&
            !(lastCharType === 'UPPERCASE' && charType === 'LOWERCASE') &&
            !(lastCharType === 'NUMBER') &&
            !(charType === 'NUMBER')
        ) {
            normalizedName += '_';
        }

        normalizedName += normalizedChar;

        lastCharType = charType;
    }

    normalizedName = normalizedName.replace(/_+/g, '_');
    normalizedName = normalizedName.replace(/_?\/_?/g, '/');
    normalizedName = normalizedName.replace(/^_/, '');
    normalizedName = normalizedName.replace(/_$/, '');

    return normalizedName;
}

/**
 * TODO: Tests
 *     > expect(encodeRoutePath({ uriId: 'VtG7sR9rRJqwNEdM2', name: 'Moje tabule' })).toEqual('/VtG7sR9rRJqwNEdM2/Moje tabule');
 *     > expect(encodeRoutePath({ uriId: 'VtG7sR9rRJqwNEdM2', name: 'ěščřžžýáíúů' })).toEqual('/VtG7sR9rRJqwNEdM2/escrzyaieuu');
 *     > expect(encodeRoutePath({ uriId: 'VtG7sR9rRJqwNEdM2', name: '  ahoj  ' })).toEqual('/VtG7sR9rRJqwNEdM2/ahoj');
 *     > expect(encodeRoutePath({ uriId: 'VtG7sR9rRJqwNEdM2', name: '  ahoj_ahojAhoj    ahoj  ' })).toEqual('/VtG7sR9rRJqwNEdM2/ahoj-ahoj-ahoj-ahoj');
 * TODO: [🌺] Use some intermediate util splitWords
 */
