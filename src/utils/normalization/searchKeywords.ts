import type { Keywords } from './IKeywords';

/**
 * @@@
 *
 * @param haystack
 * @param needle
 * @returns
 * @public exported from `@promptbook/utils`
 */
export function searchKeywords(haystack: Keywords, needle: Keywords): boolean {
    for (const needleWord of needle) {
        if (![...haystack].some((haystackWord) => haystackWord.substring(0, needleWord.length) === needleWord)) {
            return false;
        }
    }
    return true;
}
