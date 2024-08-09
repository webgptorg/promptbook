import { DIACRITIC_VARIANTS_LETTERS } from './DIACRITIC_VARIANTS_LETTERS';

/**
 * @@@
 *
 * @param input @@@
 * @returns @@@
 * @public exported from `@promptbook/utils`
 */
export function removeDiacritics(input: string): string {
    /*eslint no-control-regex: "off"*/
    return input.replace(/[^\u0000-\u007E]/g, (a) => {
        return DIACRITIC_VARIANTS_LETTERS[a] || a;
    });
}

/**
 * TODO: [Ж] Variant for cyrillic (and in general non-latin) letters
 */
