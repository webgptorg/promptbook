import type { string_persona_description } from '../../types/typeAliases';
import { $randomItem } from './$randomItem';

const PERSONALITIES: ReadonlyArray<string_persona_description> = [
    'Friendly and helpful AI agent.',
    'Professional and efficient virtual assistant.',
    'Creative and imaginative digital companion.',
    'Knowledgeable and informative AI guide.',
    'Empathetic and understanding support bot.',
    'Energetic and enthusiastic conversational partner.',
    'Calm and patient virtual helper.',
    'Curious and inquisitive AI explorer.',
    'Witty and humorous digital friend.',
    'Serious and focused AI consultant.',
];

/**
 * Generates a random agent persona description.
 *
 * This function selects a random personality profile from a predefined pool
 * of common AI agent characteristics (e.g., friendly, professional, creative).
 *
 * @returns A string describing the agent's persona
 * @private internal helper function
 */
export function $randomAgentPersona(): string_persona_description {
    return $randomItem(...PERSONALITIES);
}

/**
 * TODO: [🤶] Maybe export through `@promptbook/utils` or `@promptbook/random` package
 */
