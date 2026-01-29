import type { LinguisticHashWordLists } from './linguisticHashTypes';
import { LINGUISTIC_HASH_WORD_LISTS_CS } from './linguisticHashWords.cs';
import { LINGUISTIC_HASH_WORD_LISTS_EN } from './linguisticHashWords.en';

/**
 * Supported language codes for linguistic hash output.
 */
export type LinguisticHashLanguage = 'en' | 'cs';

/**
 * Language-specific configuration for linguistic hash generation.
 */
export type LinguisticHashLanguageConfig = {
    language: LinguisticHashLanguage;
    label: string;
    wordLists: LinguisticHashWordLists;
};

/**
 * Default language used for linguistic hashes.
 */
export const DEFAULT_LINGUISTIC_HASH_LANGUAGE: LinguisticHashLanguage = 'en';

const LANGUAGE_CONFIGS: Record<LinguisticHashLanguage, LinguisticHashLanguageConfig> = {
    en: {
        language: 'en',
        label: 'English',
        wordLists: LINGUISTIC_HASH_WORD_LISTS_EN,
    },
    cs: {
        language: 'cs',
        label: 'Czech',
        wordLists: LINGUISTIC_HASH_WORD_LISTS_CS,
    },
};

/**
 * Ordered list of supported linguistic hash languages.
 */
export const LINGUISTIC_HASH_LANGUAGES: readonly LinguisticHashLanguageConfig[] = [
    LANGUAGE_CONFIGS.en,
    LANGUAGE_CONFIGS.cs,
];

/**
 * Normalizes a requested language to a supported linguistic hash language.
 */
export function normalizeLinguisticHashLanguage(language?: string | null): LinguisticHashLanguage {
    if (typeof language !== 'string') {
        return DEFAULT_LINGUISTIC_HASH_LANGUAGE;
    }

    const normalized = language.trim().toLowerCase();
    if (normalized === 'cs') {
        return 'cs';
    }

    if (normalized === 'en') {
        return 'en';
    }

    return DEFAULT_LINGUISTIC_HASH_LANGUAGE;
}

/**
 * Returns the language configuration for linguistic hash generation.
 */
export function getLinguisticHashLanguageConfig(language?: string | null): LinguisticHashLanguageConfig {
    const normalized = normalizeLinguisticHashLanguage(language);
    return LANGUAGE_CONFIGS[normalized];
}
