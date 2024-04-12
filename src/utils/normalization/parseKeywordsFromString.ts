import { IKeywords } from './IKeywords';
import { normalizeTo_SCREAMING_CASE } from './normalizeTo_SCREAMING_CASE';
import { removeDiacritics } from './removeDiacritics';

/**
 * Parses keywords from a string
 *
 * @param {string} input
 * @returns {Set} of keywords without diacritics in lowercase
 */

export function parseKeywordsFromString(input: string): IKeywords {
    const keywords = normalizeTo_SCREAMING_CASE(removeDiacritics(input))
        .toLowerCase()
        .split(/[^a-z0-9]+/gs)
        .filter((value) => value);

    return new Set(keywords);
}
