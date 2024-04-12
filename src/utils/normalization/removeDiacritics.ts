import { DIACRITIC_VARIANTS_LETTERS } from "./DIACRITIC_VARIANTS_LETTERS";

/**
 *
 */
export function removeDiacritics(input: string): string {
    /*eslint no-control-regex: "off"*/
    return input.replace(/[^\u0000-\u007E]/g, (a) => {
        return DIACRITIC_VARIANTS_LETTERS[a] || a;
    });
}
