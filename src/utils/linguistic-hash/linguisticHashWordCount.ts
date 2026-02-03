import { MAX_LINGUISTIC_HASH_WORD_COUNT } from './linguisticHashWordSelection';

/**
 * The minimum number of words for a linguistic hash.
 *
 * @private utility of `linguisticHash`
 */
export const MIN_LINGUISTIC_HASH_WORD_COUNT = 1;

/**
 * The default number of words for a linguistic hash.
 *
 * @private utility of `linguisticHash`
 */
export const DEFAULT_LINGUISTIC_HASH_WORD_COUNT = 7;

/**
 * Normalizes the word count to a supported integer range.
 *
 * @private utility of `linguisticHash`
 */
export function normalizeLinguisticHashWordCount(wordCount?: number | null): number {
    if (typeof wordCount !== 'number' || !Number.isFinite(wordCount)) {
        return DEFAULT_LINGUISTIC_HASH_WORD_COUNT;
    }

    const rounded = Math.round(wordCount);
    return Math.min(MAX_LINGUISTIC_HASH_WORD_COUNT, Math.max(MIN_LINGUISTIC_HASH_WORD_COUNT, rounded));
}

export { MAX_LINGUISTIC_HASH_WORD_COUNT };

/**
 * Bundled helpers for linguistic hash word count handling.
 *
 * @private utility of `linguisticHash`
 */
export const linguisticHashWordCount = {
    DEFAULT_LINGUISTIC_HASH_WORD_COUNT,
    MAX_LINGUISTIC_HASH_WORD_COUNT,
    MIN_LINGUISTIC_HASH_WORD_COUNT,
    normalizeLinguisticHashWordCount,
};
