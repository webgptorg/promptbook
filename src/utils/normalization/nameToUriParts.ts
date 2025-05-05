import { nameToUriPart } from './nameToUriPart';

/**
 * Converts a given name into URI-compatible parts.
 *
 * @param name The name to be converted into URI parts.
 * @returns An array of URI-compatible parts derived from the name.
 * @example 'Example Name' -> ['example', 'name']
 * @public exported from `@promptbook/utils`
 */
export function nameToUriParts(name: string): string[] {
    return nameToUriPart(name)
        .split('-')
        .filter((value) => value !== '');
}
