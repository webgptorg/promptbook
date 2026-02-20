import { isValidUrl } from './isValidUrl';

/** @private Matches URL-like candidates inside arbitrary text. */
const URL_CANDIDATE_PATTERN = /https?:\/\/[^\s<>"'`]+/g;

/** @private Trims punctuation that commonly trails URLs in prose. */
const TRAILING_PUNCTUATION_PATTERN = /[.,!?;:'"`]+$/;

/**
 * Extracts all valid URLs from arbitrary text while removing common trailing punctuation.
 *
 * @param text - Input text that may contain one or more URLs.
 * @returns Unique URLs in their first-seen order.
 * @private utility of KNOWLEDGE parsing
 */
export function extractUrlsFromText(text: string): string[] {
    if (!text) {
        return [];
    }

    const candidates = text.match(URL_CANDIDATE_PATTERN);
    if (!candidates) {
        return [];
    }

    const urls: string[] = [];
    const seen = new Set<string>();

    for (const candidate of candidates) {
        const normalizedCandidate = normalizeUrlCandidate(candidate);

        if (!normalizedCandidate) {
            continue;
        }

        if (!isValidUrl(normalizedCandidate)) {
            continue;
        }

        if (seen.has(normalizedCandidate)) {
            continue;
        }

        seen.add(normalizedCandidate);
        urls.push(normalizedCandidate);
    }

    return urls;
}

/**
 * @private Normalizes one extracted URL candidate by stripping trailing punctuation and unmatched closing wrappers.
 */
function normalizeUrlCandidate(candidate: string): string {
    let normalized = candidate.trim();

    if (!normalized) {
        return '';
    }

    let shouldContinue = true;

    while (shouldContinue) {
        const before = normalized;
        normalized = normalized.replace(TRAILING_PUNCTUATION_PATTERN, '');
        normalized = stripTrailingUnmatchedClosing(normalized, '(', ')');
        normalized = stripTrailingUnmatchedClosing(normalized, '[', ']');
        normalized = stripTrailingUnmatchedClosing(normalized, '{', '}');
        normalized = normalized.replace(TRAILING_PUNCTUATION_PATTERN, '');

        shouldContinue = normalized !== before;
    }

    return normalized;
}

/**
 * @private Removes trailing closing wrappers when they are unmatched in the candidate.
 */
function stripTrailingUnmatchedClosing(candidate: string, openingChar: string, closingChar: string): string {
    let normalized = candidate;

    while (normalized.endsWith(closingChar)) {
        const openingCount = countOccurrences(normalized, openingChar);
        const closingCount = countOccurrences(normalized, closingChar);

        if (closingCount <= openingCount) {
            break;
        }

        normalized = normalized.slice(0, -1);
    }

    return normalized;
}

/**
 * @private Counts character occurrences in a string.
 */
function countOccurrences(value: string, searchedChar: string): number {
    let count = 0;

    for (const currentChar of value) {
        if (currentChar === searchedChar) {
            count++;
        }
    }

    return count;
}
