import type { LinguisticHashWordKind, LinguisticHashWordLists } from './linguisticHashTypes';

/**
 * @@@
 *
 * @private utility of `linguisticHash`
 */
const HASH_SEGMENT_LENGTH = 8;

/**
 * Ordered word kinds used to build the linguistic hash output.
 *
 * @private utility of `linguisticHash`
 */
const WORD_SEQUENCE: LinguisticHashWordKind[] = [
    'adjective',
    'noun',
    'verb',
    'adjective',
    'noun',
    'verb',
    'adjective',
    'noun',
    'verb',
    'adjective',
    'noun',
    'verb',
    'adjective',
    'noun',
    'verb',
    'adjective',
    'noun',
    'verb',
    'adjective',
    'noun',
];

/**
 * The maximum number of words for a linguistic hash.
 *
 * @private utility of `linguisticHash`
 */
export const MAX_LINGUISTIC_HASH_WORD_COUNT = WORD_SEQUENCE.length;

/**
 * Index of the noun used for single-word hashes.
 *
 * @private utility of `linguisticHash`
 */
const SINGLE_WORD_INDEX = 1;

/**
 * Extracts a deterministic numeric seed from a SHA-256 hash.
 *
 * @private utility of `linguisticHash`
 */
function getHashSeed(hash: string, segmentIndex: number): number {
    const expandedHash: string = `${hash}${hash}`;
    const start: number = (segmentIndex * HASH_SEGMENT_LENGTH + segmentIndex) % hash.length;
    return parseInt(expandedHash.substring(start, start + HASH_SEGMENT_LENGTH), 16);
}

/**
 * Picks a deterministic item from a list based on the hash seed.
 *
 * @private utility of `linguisticHash`
 */
function pickFromHash<T>(hash: string, segmentIndex: number, list: readonly T[]): T {
    const seed = getHashSeed(hash, segmentIndex);
    return list[seed % list.length]!;
}

/**
 * Picks a deterministic word from the hash by kind.
 *
 * @private utility of `linguisticHash`
 */
function pickWordFromHash(
    hash: string,
    segmentIndex: number,
    wordKind: LinguisticHashWordKind,
    wordLists: LinguisticHashWordLists,
): string {
    return pickFromHash(hash, segmentIndex, wordLists[wordKind]);
}

/**
 * Creates the deterministic word sequence used for the linguistic hash output.
 *
 * @private utility of `linguisticHash`
 */
function createLinguisticHashWordSequence(hash: string, wordLists: LinguisticHashWordLists): string[] {
    return WORD_SEQUENCE.map((wordKind, index) => pickWordFromHash(hash, index, wordKind, wordLists));
}

/**
 * Selects the requested number of words from the hash output.
 *
 * @private utility of `linguisticHash`
 */
export function createLinguisticHashWords(
    hash: string,
    wordCount: number,
    wordLists: LinguisticHashWordLists,
): string[] {
    const words = createLinguisticHashWordSequence(hash, wordLists);

    if (wordCount === 1) {
        return [words[SINGLE_WORD_INDEX]!];
    }

    return words.slice(0, wordCount);
}

/**
 * Bundled helpers for the linguistic hash word selection module.
 *
 * @private utility of `linguisticHash`
 */
export const linguisticHashWordSelection = {
    createLinguisticHashWords,
    MAX_LINGUISTIC_HASH_WORD_COUNT,
};
