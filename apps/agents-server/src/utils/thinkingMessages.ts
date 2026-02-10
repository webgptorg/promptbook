import { DEFAULT_THINKING_MESSAGES } from '../../../../src/utils/DEFAULT_THINKING_MESSAGES';
import { getMetadata } from '../database/getMetadata';
import { parseSlashSeparatedMetadata } from './metadataVariants';

export { DEFAULT_THINKING_MESSAGES };

/**
 * Parses THINKING_MESSAGES metadata into a list of normalized variants.
 *
 * @param raw - Raw metadata string, slash-delimited.
 * @returns Trimmed, non-empty variants or the shared defaults.
 */
export function parseThinkingMessages(raw: string | null | undefined): ReadonlyArray<string> {
    const variants = parseSlashSeparatedMetadata(raw);
    return variants.length > 0 ? variants : DEFAULT_THINKING_MESSAGES;
}

/**
 * Loads the THINKING_MESSAGES metadata value and parses the configured variants.
 *
 * @returns Active thinking message variants (never empty).
 */
export async function getThinkingMessages(): Promise<ReadonlyArray<string>> {
    const raw = await getMetadata('THINKING_MESSAGES');
    return parseThinkingMessages(raw);
}
