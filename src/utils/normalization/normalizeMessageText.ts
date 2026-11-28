import { spaceTrim } from 'spacetrim';

/**
 * Normalizes message text for comparison
 *
 * @param text The message text to normalize
 * @returns The normalized message text
 *
 * @public exported from `@promptbook/utils`
 */
export function normalizeMessageText(text: string): string {
    return spaceTrim(text);
}
