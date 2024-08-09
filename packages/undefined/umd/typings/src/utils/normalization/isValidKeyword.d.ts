import type { string_keyword } from './IKeywords';
/**
 * Tests if keyword is valid
 *
 * @param keyword to test
 * @returns if keyword is valid or not
 *
 * @public exported from `@promptbook/utils`
 */
export declare function isValidKeyword(keyword: string): keyword is string_keyword;
