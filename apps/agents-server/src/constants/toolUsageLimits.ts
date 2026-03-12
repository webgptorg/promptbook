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
