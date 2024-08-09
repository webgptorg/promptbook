import { removeDiacritics } from './removeDiacritics';

/**
 * @@@
 * 
 * @param name @@@
 * @returns @@@
 * @example @@@
 * @public exported from `@promptbook/utils`
 */
export function nameToUriPart(name: string): string {
    let uriPart = name;

    uriPart = uriPart.toLowerCase();
    uriPart = removeDiacritics(uriPart);
    uriPart = uriPart.replace(/[^a-zA-Z0-9]+/g, '-');
    uriPart = uriPart.replace(/^-+/, '');
    uriPart = uriPart.replace(/-+$/, '');
    return uriPart;
}
