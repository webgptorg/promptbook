import { parse } from 'yaml';

import {
    SERVER_TRANSLATION_KEY_SET,
    SERVER_TRANSLATION_KEYS,
    type ServerTranslationDictionary,
    type ServerTranslationKey,
} from './ServerTranslationKeys';

type RawTranslationMap = Record<string, unknown>;

/**
 * Parses one translation YAML source and validates that it includes every key.
 *
 * @param languageName - Friendly name of the language used in error messages.
 * @param rawYaml - Raw YAML document produced by developers.
 * @returns Parsed translation dictionary that satisfies {@link ServerTranslationDictionary}.
 *
 * @private internal helper for parsing translation YAML sources
 */
export function createServerTranslationDictionary(
    languageName: string,
    rawYaml: string,
): ServerTranslationDictionary {
    const parsed = parse(rawYaml);

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error(`${languageName} translations must be defined as a mapping of strings.`);
    }

    const rawMap = parsed as RawTranslationMap;
    const missingKeys: ServerTranslationKey[] = [];
    const dictionary: Partial<Record<ServerTranslationKey, string>> = {};

    for (const key of SERVER_TRANSLATION_KEYS) {
        const value = rawMap[key];
        if (typeof value !== 'string') {
            missingKeys.push(key);
            continue;
        }
        dictionary[key] = value;
    }

    if (missingKeys.length) {
        throw new Error(`Missing translations for ${languageName}: ${missingKeys.join(', ')}`);
    }

    const extraKeys = Object.keys(rawMap).filter((key) => !SERVER_TRANSLATION_KEY_SET.has(key as ServerTranslationKey));
    if (extraKeys.length) {
        throw new Error(`Unknown translation keys for ${languageName}: ${extraKeys.join(', ')}`);
    }

    return dictionary as ServerTranslationDictionary;
}
