/**
 * Metadata key controlling which built-in name pool is used for generated agents.
 */
export const NAME_POOL_METADATA_KEY = 'NAME_POOL' as const;

/**
 * Supported built-in name pools exposed through Agents Server metadata.
 */
export const NAME_POOL_VALUES = ['ENGLISH', 'CZECH'] as const;

/**
 * Canonical union of supported name-pool values.
 */
export type NamePoolMetadataValue = (typeof NAME_POOL_VALUES)[number];

/**
 * Shared select options for name-pool metadata and setup flows.
 */
export const NAME_POOL_OPTIONS: ReadonlyArray<{ readonly value: NamePoolMetadataValue; readonly label: string }> = [
    {
        value: 'ENGLISH',
        label: 'English',
    },
    {
        value: 'CZECH',
        label: 'Czech',
    },
] as const;

/**
 * Default name pool used when metadata is missing or invalid.
 */
export const DEFAULT_NAME_POOL: NamePoolMetadataValue = 'ENGLISH';

/**
 * Parses one raw metadata value into a supported name-pool selection.
 *
 * @param value - Raw metadata value.
 * @param fallback - Fallback pool used for missing or invalid values.
 * @returns Safe supported name-pool value.
 */
export function parseNamePool(
    value: string | null | undefined,
    fallback: NamePoolMetadataValue = DEFAULT_NAME_POOL,
): NamePoolMetadataValue {
    if (typeof value !== 'string') {
        return fallback;
    }

    const normalizedValue = value.trim().toUpperCase();
    return NAME_POOL_VALUES.includes(normalizedValue as NamePoolMetadataValue)
        ? (normalizedValue as NamePoolMetadataValue)
        : fallback;
}
