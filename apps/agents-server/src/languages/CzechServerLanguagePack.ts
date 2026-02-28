import type { ServerLanguagePack } from './ServerLanguagePack';
import type { ServerTranslationDictionary, ServerTranslationKey } from './ServerTranslationKeys';
import { createServerTranslationDictionary } from './createServerTranslationDictionary';
import czechTranslationsYaml from './translations/czech.yaml?raw';

/**
 * Built-in Czech translation catalog.
 *
 * @private parsed from the YAML source maintained inside the repo
 */
const CzechServerTranslations: ServerTranslationDictionary = createServerTranslationDictionary(
    'Czech',
    czechTranslationsYaml,
);

/**
 * Built-in Czech language pack.
 *
 * @public exported from `promptbook-agents-server`
 */
export const CzechServerLanguagePack: ServerLanguagePack<ServerTranslationKey> = {
    language: 'cs',
    englishName: 'Czech',
    nativeName: 'Čeština',
    translations: CzechServerTranslations,
};
