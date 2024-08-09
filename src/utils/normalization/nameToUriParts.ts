import { nameToUriPart } from './nameToUriPart';

/**
 * @@@
 *
 * @param name @@@
 * @returns @@@
 * @example @@@
 * @public exported from `@promptbook/utils`
 */
export function nameToUriParts(name: string): string[] {
    return nameToUriPart(name)
        .split('-')
        .filter((value) => value !== '');
}
