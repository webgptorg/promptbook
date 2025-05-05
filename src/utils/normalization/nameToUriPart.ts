import { removeDiacritics } from './removeDiacritics';

/**
 * Converts a name string into a URI-compatible format.
 *
 * @param name The string to be converted to a URI-compatible format.
 * @returns A URI-compatible string derived from the input name.
 * @example 'Hello World' -> 'hello-world'
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
