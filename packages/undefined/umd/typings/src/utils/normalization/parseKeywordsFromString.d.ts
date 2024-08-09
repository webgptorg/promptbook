import type { IKeywords } from './IKeywords';
/**
 * Parses keywords from a string
 *
 * @param {string} input
 * @returns {Set} of keywords without diacritics in lowercase
 * @public exported from `@promptbook/utils`
 */
export declare function parseKeywordsFromString(input: string): IKeywords;
