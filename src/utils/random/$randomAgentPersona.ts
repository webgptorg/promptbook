import { string_person_firstname } from '../../types/typeAliases';
import { $randomItem } from './$randomItem';

const PERSONALITIES: ReadonlyArray<string_person_firstname> = [
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
 * @@@@
 *
 * @private internal helper function
 */
export function $randomAgentPersona(): string {
    return $randomItem(...PERSONALITIES);
}

/**
 * TODO: [🤶] Maybe export through `@promptbook/utils` or `@promptbook/random` package
 */
