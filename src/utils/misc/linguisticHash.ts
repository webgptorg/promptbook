import { capitalize } from '../normalization/capitalize';
import { computeHash } from './computeHash';
import { getLinguisticHashLanguageConfig } from './linguisticHashLanguages';
import type { LinguisticHashLanguage } from './linguisticHashLanguages';
import type { LinguisticHashWordKind, LinguisticHashWordLists } from './linguisticHashTypes';

export {
    DEFAULT_LINGUISTIC_HASH_LANGUAGE,
    LINGUISTIC_HASH_LANGUAGES,
    normalizeLinguisticHashLanguage,
} from './linguisticHashLanguages';
export type { LinguisticHashLanguage } from './linguisticHashLanguages';

/**
 * Creates a human-readable hash as a short, story-like phrase.
 *
 * @param wordCount how many words to include (defaults to {@link DEFAULT_LINGUISTIC_HASH_WORD_COUNT}, clamped to
 * {@link MIN_LINGUISTIC_HASH_WORD_COUNT}..{@link MAX_LINGUISTIC_HASH_WORD_COUNT})
 * @param language optional language code (defaults to {@link DEFAULT_LINGUISTIC_HASH_LANGUAGE})
 *
 * @public exported from `@promptbook/utils`
 */
export async function linguisticHash(
    input: string,
    wordCount?: number,
    language?: LinguisticHashLanguage,
): Promise<string> {
    const hash: string = computeHash(input);
    const normalizedWordCount = normalizeLinguisticHashWordCount(wordCount);
    const languageConfig = getLinguisticHashLanguageConfig(language);
    const words = createLinguisticHashWords(hash, normalizedWordCount, languageConfig.wordLists);

    return capitalize(words.join(' '));
}

const HASH_SEGMENT_LENGTH = 8;

/**
 * The minimum number of words for a linguistic hash.
 */
export const MIN_LINGUISTIC_HASH_WORD_COUNT = 1;

/**
 * The default number of words for a linguistic hash.
 */
export const DEFAULT_LINGUISTIC_HASH_WORD_COUNT = 7;

/**
 * Extracts a deterministic numeric seed from a SHA-256 hash.
 */
function getHashSeed(hash: string, segmentIndex: number): number {
    const expandedHash: string = `${hash}${hash}`;
    const start: number = (segmentIndex * HASH_SEGMENT_LENGTH + segmentIndex) % hash.length;
    return parseInt(expandedHash.substring(start, start + HASH_SEGMENT_LENGTH), 16);
}

/**
 * Picks a deterministic item from a list based on the hash seed.
 */
function pickFromHash<T>(hash: string, segmentIndex: number, list: readonly T[]): T {
    const seed = getHashSeed(hash, segmentIndex);
    return list[seed % list.length]!;
}

/**
 * Ordered word kinds used to build the linguistic hash output.
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
 */
export const MAX_LINGUISTIC_HASH_WORD_COUNT = WORD_SEQUENCE.length;

/**
 * Index of the noun used for single-word hashes.
 */
const SINGLE_WORD_INDEX = 1;

/**
 * Normalizes the word count to a supported integer range.
 */
export function normalizeLinguisticHashWordCount(wordCount?: number | null): number {
    if (typeof wordCount !== 'number' || !Number.isFinite(wordCount)) {
        return DEFAULT_LINGUISTIC_HASH_WORD_COUNT;
    }

    const rounded = Math.round(wordCount);
    return Math.min(MAX_LINGUISTIC_HASH_WORD_COUNT, Math.max(MIN_LINGUISTIC_HASH_WORD_COUNT, rounded));
}

/**
 * Picks a deterministic word from the hash by kind.
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
 */
function createLinguisticHashWordSequence(hash: string, wordLists: LinguisticHashWordLists): string[] {
    return WORD_SEQUENCE.map((wordKind, index) => pickWordFromHash(hash, index, wordKind, wordLists));
}

/**
 * Selects the requested number of words from the hash output.
 */
function createLinguisticHashWords(hash: string, wordCount: number, wordLists: LinguisticHashWordLists): string[] {
    const words = createLinguisticHashWordSequence(hash, wordLists);

    if (wordCount === 1) {
        return [words[SINGLE_WORD_INDEX]!];
    }

    return words.slice(0, wordCount);
}
