/**
 * Supported visibility states for Agents Server instances.
 */
export const SERVER_VISIBILITY_VALUES = ['PRIVATE', 'PUBLIC'] as const;

/**
 * Canonical visibility union for servers.
 */
export type ServerVisibility = (typeof SERVER_VISIBILITY_VALUES)[number];

/**
 * Shared select options for server-visibility pickers.
 */
export const SERVER_VISIBILITY_OPTIONS: ReadonlyArray<{
    readonly value: ServerVisibility;
    readonly label: string;
}> = [
    {
        value: 'PRIVATE',
        label: 'Private',
    },
    {
        value: 'PUBLIC',
        label: 'Public',
    },
] as const;

/**
 * Metadata key used to configure server crawling/indexing visibility.
 */
export const SERVER_VISIBILITY_METADATA_KEY = 'SERVER_VISIBILITY' as const;

/**
 * Fallback visibility used when server metadata/env is missing or invalid.
 */
export const DEFAULT_SERVER_VISIBILITY: ServerVisibility = 'PRIVATE';

/**
 * Returns `true` when the value is one of supported server visibility states.
 *
 * @param value - Raw value to validate.
 * @returns Whether the value is a valid `ServerVisibility`.
 */
export function isServerVisibility(value: unknown): value is ServerVisibility {
    return typeof value === 'string' && SERVER_VISIBILITY_VALUES.includes(value as ServerVisibility);
}

/**
 * Parses server visibility from an unknown value with a safe fallback.
 *
 * @param value - Raw visibility value.
 * @param fallback - Fallback when the value is invalid.
 * @returns Parsed server visibility.
 */
export function parseServerVisibility(
    value: unknown,
    fallback: ServerVisibility = DEFAULT_SERVER_VISIBILITY,
): ServerVisibility {
    if (typeof value !== 'string') {
        return fallback;
    }

    const normalized = value.trim().toUpperCase();
    return isServerVisibility(normalized) ? normalized : fallback;
}

/**
 * Returns whether the server is publicly crawlable/indexable.
 *
 * @param visibility - Server visibility to evaluate.
 * @returns `true` for public servers.
 */
export function isPublicServerVisibility(visibility: ServerVisibility | null | undefined): boolean {
    return visibility === 'PUBLIC';
}
