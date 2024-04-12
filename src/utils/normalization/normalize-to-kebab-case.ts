/* tslint:disable */
/* TODO: Enable TSLint */

import { removeDiacritics } from './removeDiacritics';

export function normalizeToKebabCase(sentence: string): string {
    sentence = removeDiacritics(sentence);

    let charType: char_type;
    let lastCharType: char_type = 'OTHER';

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

type char_type = 'LOWERCASE' | 'UPPERCASE' | 'NUMBER' | 'SLASH' | 'OTHER';
