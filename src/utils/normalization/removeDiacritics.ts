import { DIACRITIC_VARIANTS_LETTERS } from './DIACRITIC_VARIANTS_LETTERS';

/**
 * Removes diacritic marks (accents) from characters in a string.
 *
 * Note: [🔂] This function is idempotent.
 *
 * @param input The string containing diacritics to be normalized.
 * @returns The string with diacritics removed or normalized.
 * @public exported from `@promptbook/utils`
 */
export function removeDiacritics(input: string): string {
    /*eslint no-control-regex: "off"*/
    return input.replace(/[^\u0000-\u007E]/g, (character) => {
        return DIACRITIC_VARIANTS_LETTERS[character] || character;
    });
}

/**
 * TODO: [Ж] Variant for cyrillic (and in general non-latin) letters
 */
