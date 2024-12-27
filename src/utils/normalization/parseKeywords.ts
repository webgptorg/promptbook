import type { really_unknown } from '../organization/really_unknown';
import type { Keywords } from './IKeywords';
import { parseKeywordsFromString } from './parseKeywordsFromString';

/**
 * Parses keywords from any object and recursively walks through
 *
 * Tip: If you want to parse multiple inputs, just wrap them in an array
 *
 * @param input of any kind
 * @returns {Set} of keywords without diacritics in lowercase
 * @public exported from `@promptbook/utils`
 */
export function parseKeywords(input: really_unknown): Keywords {
    if (typeof input === 'string') {
        return parseKeywordsFromString(input);
    } else if (typeof input === 'object') {
        if (Array.isArray(input)) {
            return input.map(parseKeywords).reduce((a, b) => new Set([...a, ...b]), new Set());
        } else if (input === null) {
            return new Set();
        } else {
            return parseKeywords(Object.values(input));
        }
    } else {
        return new Set();
    }
}

/**
 * Note: Not using spread in input param because of keeping second parameter for options
 * TODO: [🌺] Use some intermediate util splitWords
 */
