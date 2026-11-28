import { CzechServerLanguagePack } from './CzechServerLanguagePack';
import { EnglishServerLanguagePack } from './EnglishServerLanguagePack';

/**
 * Registry of pluggable language packs for the Agents Server UI.
 *
 * Add new language packs here to make them available in the language switcher.
 */
export const ServerLanguageRegistry = [EnglishServerLanguagePack, CzechServerLanguagePack] as const;

/**
 * Supported language code derived from the language registry.
 */
export type ServerLanguageCode = (typeof ServerLanguageRegistry)[number]['language'];

/**
 * Shared select options for server-language configuration.
 */
export const SERVER_LANGUAGE_OPTIONS: ReadonlyArray<{
    readonly value: ServerLanguageCode;
    readonly label: string;
}> = ServerLanguageRegistry.map((languagePack) => ({
    value: languagePack.language,
    label: languagePack.englishName,
}));

/**
 * Metadata key controlling the default server language.
 */
export const SERVER_LANGUAGE_METADATA_KEY = 'SERVER_LANGUAGE';

/**
 * Metadata key controlling whether the server language can be locally overridden by the user.
 */
export const IS_SERVER_LANGUAGE_ENFORCED_METADATA_KEY = 'IS_SERVER_LANGUAGE_ENFORCED';

/**
 * Local storage key used for per-browser language override.
 */
export const SERVER_LANGUAGE_STORAGE_KEY = 'promptbook_agents_server_language';

/**
 * Cookie key used for language override on server-rendered pages.
 */
export const SERVER_LANGUAGE_COOKIE_NAME = 'promptbook_agents_server_language';

/**
 * Fallback language used when no valid language is configured.
 */
export const DEFAULT_SERVER_LANGUAGE: ServerLanguageCode = 'en';

/**
 * Fast lookup map for language packs by language code.
 */
const serverLanguagePackByCode = new Map<string, (typeof ServerLanguageRegistry)[number]>(
    ServerLanguageRegistry.map((pack) => [pack.language, pack]),
);

/**
 * Resolves one language code to a known registry entry or the default.
 *
 * @param language - Raw language code from metadata, cookie, or local storage.
 * @returns Safe supported language code.
 */
export function resolveServerLanguageCode(language: string | null | undefined): ServerLanguageCode {
    if (language && serverLanguagePackByCode.has(language)) {
        return language as ServerLanguageCode;
    }

    return DEFAULT_SERVER_LANGUAGE;
}

/**
 * Parses the server-language enforcement metadata value.
 *
 * @param value - Raw metadata value.
 * @returns `true` only when the metadata explicitly equals `true`.
 */
export function parseServerLanguageEnforcedMetadata(value: string | null | undefined): boolean {
    return value === 'true';
}

/**
 * Resolves one language pack from a potentially unknown language code.
 *
 * @param language - Raw language code from metadata, cookie, or local storage.
 * @returns Matching language pack or the English fallback pack.
 */
export function getServerLanguagePack(language: string | null | undefined) {
    const resolvedLanguage = resolveServerLanguageCode(language);
    return serverLanguagePackByCode.get(resolvedLanguage) || EnglishServerLanguagePack;
}
