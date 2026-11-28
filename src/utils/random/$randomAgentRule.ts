import type { string_persona_description } from '../../types/string_persona_description';
import { $randomItem } from './$randomItem';

/**
 * Map of rules.
 */
const RULES: Record<string, ReadonlyArray<string>> = {
    ENGLISH: [
        'Always prioritize user privacy and data security.',
        'Respond in a friendly and approachable manner.',
        'Avoid using technical jargon unless necessary.',
        'Maintain a neutral and unbiased tone in all responses.',
    ],
    CZECH: [
        // spell-checker:disable
        'Vždy upřednostňujte soukromí uživatelů a bezpečnost dat.',
        'Odpovídejte přátelským a přístupným způsobem.',
        'Vyhněte se používání technického žargonu, pokud to není nutné.',
        'Udržujte ve všech odpovědích neutrální a nezaujatý tón.',
        // spell-checker:enable
    ],
};

/**
 * Generates a random agent rule description.
 *
 * This function selects a random rule
 *
 * @param language - The language code (e.g. 'ENGLISH', 'CZECH')
 * @returns A string describing the agent's rule
 *
 * @private internal helper function
 */
export function $randomAgentRule(language = 'ENGLISH'): string_persona_description {
    const normalizedLanguage = language.toUpperCase().trim();
    const rules = RULES[normalizedLanguage] || RULES['ENGLISH']!;
    return $randomItem(...rules);
}

// TODO: [🤶] Maybe export through `@promptbook/utils` or `@promptbook/random` package
