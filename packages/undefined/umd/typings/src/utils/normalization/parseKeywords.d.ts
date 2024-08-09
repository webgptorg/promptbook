import type { really_unknown } from '../organization/really_unknown';
import type { IKeywords } from './IKeywords';
/**
 * Parses keywords from any object and recursively walks through
 *
 * Tip: If you want to parse multiple inputs, just wrap them in an array
 *
 * @param input of any kind
 * @returns {Set} of keywords without diacritics in lowercase
 * @public exported from `@promptbook/utils`
 */
export declare function parseKeywords(input: really_unknown): IKeywords;
/**
 * Note: Not using spread in input param because of keeping second parameter for options
 * TODO: [🌺] Use some intermediate util splitWords
 */
