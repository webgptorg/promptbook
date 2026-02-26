import type { ServerLanguagePack } from './ServerLanguagePack';
import type { ServerTranslationDictionary, ServerTranslationKey } from './ServerTranslationKeys';
import { createServerTranslationDictionary } from './createServerTranslationDictionary';
import englishTranslationsYaml from './translations/english.yaml?raw';

/**
 * Canonical English translation catalog used as source of truth for all keys.
 *
 * @private parsed from the YAML source maintained inside the repo
 */
const EnglishServerTranslations: ServerTranslationDictionary = createServerTranslationDictionary(
    'English',
    englishTranslationsYaml,
);

/**
 * Built-in English language pack.
 *
 * @public exported from `promptbook-agents-server`
 */
export const EnglishServerLanguagePack: ServerLanguagePack<ServerTranslationKey> = {
    language: 'en',
    englishName: 'English',
    nativeName: 'English',
    translations: EnglishServerTranslations,
};
