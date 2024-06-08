import { IKeywords } from './IKeywords';

/**
 *
 */
export function searchKeywords(
    haystack: IKeywords,
    needle: IKeywords,
): boolean {
    for (const needleWord of needle) {
        if (
            ![...haystack].some(
                (haystackWord) =>
                    haystackWord.substring(0, needleWord.length) === needleWord,
            )
        ) {
            return false;
        }
    }
    return true;
}
