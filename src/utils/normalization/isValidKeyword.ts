import type { string_keyword } from './IKeywords';
import { parseKeywordsFromString } from './parseKeywordsFromString';

/**
 * Tests if keyword is valid
 *
 * @param keyword to test
 * @returns if keyword is valid or not
 * 
 * @public exported from `@promptbook/utils`
 */
export function isValidKeyword(keyword: string): keyword is string_keyword {
    const keywordParsed = parseKeywordsFromString(keyword);

    if (keywordParsed.size !== 1) {
        return false;
    }

    const keywordParsedArray = Array.from(keywordParsed);
    const keywordParsedFirst = keywordParsedArray[0];

    return keywordParsedFirst === keyword;
}
