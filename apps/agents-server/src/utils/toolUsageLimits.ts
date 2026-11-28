import {
    normalizeToolUsageLimits,
    type ToolUsageLimits,
} from '../constants/toolUsageLimits';
import {
    getLegacyToolUsageLimits,
    updateLegacyToolUsageLimits,
} from './serverLimits';

/**
 * Loads the normalized timeout tool-usage limits from the dedicated limits service.
 *
 * @returns Legacy nested tool-usage limits payload.
 *
 * @private internal utility of Agents Server
 */
export async function getToolUsageLimits(): Promise<ToolUsageLimits> {
    return getLegacyToolUsageLimits();
}

/**
 * Persists the normalized timeout tool-usage limits through the dedicated limits service.
 *
 * @param nextLimits - Unknown timeout limits payload.
 * @returns Persisted legacy nested tool-usage limits payload.
 *
 * @private internal utility of Agents Server
 */
export async function updateToolUsageLimits(nextLimits: unknown): Promise<ToolUsageLimits> {
    return updateLegacyToolUsageLimits(nextLimits);
}

/**
 * Re-exported compatibility helper used by legacy tests and metadata fallbacks.
 *
 * @param rawValue - Unknown raw payload.
 * @returns Normalized tool-usage limits.
 *
 * @private internal utility of Agents Server
 */
export { normalizeToolUsageLimits };
