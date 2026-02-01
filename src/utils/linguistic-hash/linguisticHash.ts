import { computeHash } from '../misc/computeHash';
import { capitalize } from '../normalization/capitalize';
import type { LinguisticHashLanguage } from './LinguisticHashLanguage';
import { getLinguisticHashLanguageConfig } from './LinguisticHashLanguage';
import { normalizeLinguisticHashWordCount } from './linguisticHashWordCount';
import { createLinguisticHashWords } from './linguisticHashWordSelection';

export {
    DEFAULT_LINGUISTIC_HASH_LANGUAGE,
    LINGUISTIC_HASH_LANGUAGES,
    normalizeLinguisticHashLanguage,
} from './LinguisticHashLanguage';
export type { LinguisticHashLanguage } from './LinguisticHashLanguage';
export {
    DEFAULT_LINGUISTIC_HASH_WORD_COUNT,
    MAX_LINGUISTIC_HASH_WORD_COUNT,
    MIN_LINGUISTIC_HASH_WORD_COUNT,
    normalizeLinguisticHashWordCount,
} from './linguisticHashWordCount';
// <- TODO: !!!! Remove re-exports

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
