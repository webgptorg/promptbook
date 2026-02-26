/**
 * Normalize metadata entries that act as boolean flags.
 *
 * @param raw - Raw metadata value.
 * @param fallback - The default boolean to return when the metadata is missing or unrecognized.
 * @returns Normalized boolean value.
 *
 * @private
 */
export function parseBooleanMetadataFlag(raw: string | null | undefined, fallback: boolean): boolean {
    if (raw === null || raw === undefined) {
        return fallback;
    }

    const normalized = raw.trim().toLowerCase();

    if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
        return true;
    }

    if (normalized === 'false' || normalized === '0' || normalized === 'no') {
        return false;
    }

    return fallback;
}
