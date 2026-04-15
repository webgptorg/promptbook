/**
 * Metadata key used to persist tool-usage limits.
 *
 * @private shared constant for Agents Server
 */
export const TOOL_USAGE_LIMITS_METADATA_KEY = 'TOOL_USAGE_LIMITS';

/**
 * Timeout-specific limits supported by the current admin UI.
 *
 * @private shared type for Agents Server
 */
export type TimeoutToolUsageLimits = {
    maxActivePerChat: number;
    maxFiredPerDayPerChat: number;
};

/**
 * Full tool-limits payload stored in metadata.
 *
 * The shape is intentionally extensible so other tools can be added later.
 *
 * @private shared type for Agents Server
 */
export type ToolUsageLimits = Record<string, unknown> & {
    timeout: TimeoutToolUsageLimits;
};

/**
 * Default timeout limits applied when administrators do not override them.
 *
 * @private shared constant for Agents Server
 */
export const DEFAULT_TIMEOUT_TOOL_USAGE_LIMITS: TimeoutToolUsageLimits = {
    maxActivePerChat: 5,
    maxFiredPerDayPerChat: 10,
};

/**
 * Default tool-limits payload used across metadata, admin UI, and runtime enforcement.
 *
 * @private shared constant for Agents Server
 */
export const DEFAULT_TOOL_USAGE_LIMITS: ToolUsageLimits = {
    timeout: DEFAULT_TIMEOUT_TOOL_USAGE_LIMITS,
};

/**
 * Normalizes the complete tool-limits payload while preserving unknown future keys.
 *
 * @param rawValue - Unknown persisted payload.
 * @returns Normalized tool-usage limits.
 *
 * @private shared Agents Server helper
 */
export function normalizeToolUsageLimits(rawValue: unknown): ToolUsageLimits {
    const rawLimits =
        rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)
            ? (rawValue as Record<string, unknown>)
            : {};

    return {
        ...rawLimits,
        timeout: normalizeTimeoutToolUsageLimits(rawLimits.timeout),
    };
}

/**
 * Normalizes timeout-specific limits with defaults and integer guards.
 *
 * @param rawValue - Unknown timeout payload.
 * @returns Normalized timeout tool limits.
 *
 * @private shared Agents Server helper
 */
export function normalizeTimeoutToolUsageLimits(rawValue: unknown): TimeoutToolUsageLimits {
    const rawLimits =
        rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)
            ? (rawValue as Record<string, unknown>)
            : {};

    return {
        maxActivePerChat: normalizePositiveInteger(rawLimits.maxActivePerChat, DEFAULT_TIMEOUT_TOOL_USAGE_LIMITS.maxActivePerChat),
        maxFiredPerDayPerChat: normalizePositiveInteger(
            rawLimits.maxFiredPerDayPerChat,
            DEFAULT_TIMEOUT_TOOL_USAGE_LIMITS.maxFiredPerDayPerChat,
        ),
    };
}

/**
 * Normalizes one positive integer with fallback.
 *
 * @param rawValue - Unknown raw value.
 * @param fallbackValue - Default value used when parsing fails.
 * @returns Safe positive integer.
 *
 * @private shared Agents Server helper
 */
function normalizePositiveInteger(rawValue: unknown, fallbackValue: number): number {
    const parsedValue = Number(rawValue);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        return fallbackValue;
    }

    return Math.floor(parsedValue);
}
