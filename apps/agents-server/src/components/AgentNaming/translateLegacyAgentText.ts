import { load } from 'js-yaml';
import type { ServerLanguageCode } from '../../languages/ServerLanguageRegistry';
import legacyAgentTextTranslationsCsYaml from './legacyAgentTextTranslations.cs.yaml?raw';

/**
 * Raw translation record parsed from YAML.
 */
type RawLegacyAgentTextMap = Record<string, unknown>;

/**
 * Parsed legacy Czech phrase catalog used by `formatText(...)` fallback translation.
 */
const LEGACY_AGENT_TEXT_TRANSLATIONS_CS = createLegacyAgentTextTranslations(legacyAgentTextTranslationsCsYaml);

/**
 * Frozen empty translation map reused for languages without legacy overrides.
 */
const EMPTY_LEGACY_AGENT_TEXT_TRANSLATIONS = Object.freeze({}) as Readonly<Record<string, string>>;

/**
 * Parses one legacy-phrase translation YAML document.
 *
 * @param rawYaml - Raw YAML content containing English-to-Czech phrase mapping.
 * @returns Readonly dictionary of translated phrases.
 */
function createLegacyAgentTextTranslations(rawYaml: string): Readonly<Record<string, string>> {
    const parsed = load(rawYaml);

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Legacy AgentNaming translations must be defined as a mapping of strings.');
    }

    const rawMap = parsed as RawLegacyAgentTextMap;
    const normalizedEntries: Array<[string, string]> = [];

    for (const [key, value] of Object.entries(rawMap)) {
        if (typeof value !== 'string') {
            throw new Error(`Legacy AgentNaming translation for "${key}" must be a string.`);
        }
        normalizedEntries.push([key, value]);
    }

    return Object.freeze(Object.fromEntries(normalizedEntries));
}

/**
 * Checks whether one literal phrase has an explicit legacy Czech translation.
 *
 * @param text - Source phrase to check.
 * @returns `true` when the phrase is covered by the legacy dictionary.
 */
export function hasLegacyAgentTextTranslation(text: string): boolean {
    return Object.prototype.hasOwnProperty.call(LEGACY_AGENT_TEXT_TRANSLATIONS_CS, text);
}

/**
 * Lists all canonical English legacy phrases that have explicit Czech translations.
 *
 * @returns Stable list of legacy phrase keys.
 */
export function listLegacyAgentTextTranslationKeys(): Array<string> {
    return Object.keys(LEGACY_AGENT_TEXT_TRANSLATIONS_CS);
}

/**
 * Returns the legacy phrase dictionary for one supported language.
 *
 * @param language - Active server language code.
 * @returns Legacy translation map for the language, or an empty map when none exists.
 */
export function getLegacyAgentTextTranslations(language: ServerLanguageCode): Readonly<Record<string, string>> {
    if (language === 'cs') {
        return LEGACY_AGENT_TEXT_TRANSLATIONS_CS;
    }

    return EMPTY_LEGACY_AGENT_TEXT_TRANSLATIONS;
}

/**
 * Translates one legacy hardcoded phrase used by Agents Server UI components.
 *
 * @param text - Source phrase in canonical English.
 * @param language - Active server language code.
 * @returns Localized phrase when available, otherwise the original value.
 */
export function translateLegacyAgentText(text: string, language: ServerLanguageCode): string {
    if (language !== 'cs') {
        return text;
    }

    return LEGACY_AGENT_TEXT_TRANSLATIONS_CS[text] || text;
}
