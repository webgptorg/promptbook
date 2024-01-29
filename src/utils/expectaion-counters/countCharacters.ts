import type { number_integer, number_positive } from '../../types/typeAliases';

/**
 * Counts mumber of characters in the text
 */

export function countCharacters(text: string): number_integer & number_positive {
    return text.length; /* <- TODO: Maybe better according to UTF-8? */
}
