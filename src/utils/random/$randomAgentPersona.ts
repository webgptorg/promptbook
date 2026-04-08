import type { string_persona_description } from '../../types/typeAliases';
import { $randomItem } from './$randomItem';

/**
 * Map of personalities.
 */
const PERSONALITIES: Record<string, ReadonlyArray<string_persona_description>> = {
    ENGLISH: [
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
    ],
    CZECH: [
        // spell-checker:disable
        'Přátelský a nápomocný AI agent.',
        'Profesionální a efektivní virtuální asistent.',
        'Kreativní a nápaditý digitální společník.',
        'Zkušený a informativní AI průvodce.',
        'Empatický a chápavý robot podpory.',
        'Energický a nadšený partner pro konverzaci.',
        'Klidný a trpělivý virtuální pomocník.',
        'Zvědavý a hloubavý AI průzkumník.',
        'Vtipný a humorný digitální přítel.',
        'Vážný a soustředěný AI konzultant.',
        // spell-checker:enable
    ],
};

/**
 * Generates a random agent persona description.
 *
 * This function selects a random personality profile from a predefined pool
 * of common AI agent characteristics (e.g., friendly, professional, creative).
 *
 * @param language - The language code (e.g. 'ENGLISH', 'CZECH')
 * @returns A string describing the agent's persona
 *
 * @private internal helper function
 */
export function $randomAgentPersona(language = 'ENGLISH'): string_persona_description {
    const normalizedLanguage = language.toUpperCase().trim();
    const personalities = PERSONALITIES[normalizedLanguage] || PERSONALITIES['ENGLISH']!;
    return $randomItem(...personalities);
}

// TODO: [🤶] Maybe export through `@promptbook/utils` or `@promptbook/random` package
