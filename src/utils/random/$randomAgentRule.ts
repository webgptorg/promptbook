import type { string_persona_description } from '../../types/typeAliases';
import { $randomItem } from './$randomItem';

const RULES: ReadonlyArray<string> = [
    'Always prioritize user privacy and data security.',
    'Respond in a friendly and approachable manner.',
    'Avoid using technical jargon unless necessary.',
    'Maintain a neutral and unbiased tone in all responses.',
];

/**
 * Generates a random agent rule description.
 *
 * This function selects a random rule
 *
 * @returns A string describing the agent's rule
 * @private internal helper function
 */
export function $randomAgentRule(): string_persona_description {
    return $randomItem(...RULES);
}

/**
 * TODO: [🤶] Maybe export through `@promptbook/utils` or `@promptbook/random` package
 */
