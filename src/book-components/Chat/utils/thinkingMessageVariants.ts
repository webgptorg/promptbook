import { DEFAULT_THINKING_MESSAGES } from '../../../utils/DEFAULT_THINKING_MESSAGES';

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 *
 * This file intentionally groups multiple shared thinking-message helpers.
 *
 * @private internal helper for Promptbook chat placeholders
 */

/**
 * Lower bound for one browser-side thinking-message rotation delay.
 *
 * @private internal helper for Promptbook chat placeholders
 */
const THINKING_MESSAGE_DELAY_MIN_MS = 1_000;

/**
 * Upper bound for one browser-side thinking-message rotation delay.
 *
 * @private internal helper for Promptbook chat placeholders
 */
const THINKING_MESSAGE_DELAY_MAX_MS = 5_000;

/**
 * Normalizes configured thinking-message variants to a non-empty trimmed list.
 *
 * @param thinkingMessages Raw thinking-message variants.
 * @returns Trimmed non-empty variants or the shared defaults.
 * @private internal helper for Promptbook chat placeholders
 */
export function normalizeThinkingMessageVariants(thinkingMessages?: ReadonlyArray<string>): ReadonlyArray<string> {
    if (!thinkingMessages) {
        return DEFAULT_THINKING_MESSAGES;
    }

    const normalized = thinkingMessages
        .map((message) => message?.trim())
        .filter((message): message is string => Boolean(message));

    return normalized.length > 0 ? normalized : DEFAULT_THINKING_MESSAGES;
}

/**
 * Returns a random delay used between browser-side thinking-message rotations.
 *
 * @returns Delay in milliseconds.
 * @private internal helper for Promptbook chat placeholders
 */
export function getRandomThinkingMessageDelayMs(): number {
    const range = THINKING_MESSAGE_DELAY_MAX_MS - THINKING_MESSAGE_DELAY_MIN_MS;
    return Math.floor(Math.random() * (range + 1)) + THINKING_MESSAGE_DELAY_MIN_MS;
}

/**
 * Selects one random thinking-message variant, avoiding the previous variant when possible.
 *
 * @param variants Available thinking-message variants.
 * @param excludeVariant Variant to avoid repeating immediately.
 * @returns Selected thinking-message variant.
 * @private internal helper for Promptbook chat placeholders
 */
export function getRandomThinkingMessageVariant(variants: ReadonlyArray<string>, excludeVariant?: string): string {
    if (variants.length === 0) {
        return '';
    }

    const candidates =
        excludeVariant && variants.length > 1 ? variants.filter((variant) => variant !== excludeVariant) : variants;

    if (candidates.length === 0) {
        return variants[0]!;
    }

    return candidates[Math.floor(Math.random() * candidates.length)]!;
}
