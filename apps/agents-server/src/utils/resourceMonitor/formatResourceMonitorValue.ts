/**
 * Byte units used for compact resource values.
 */
const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;

/**
 * Converts a nullable byte count into a compact display value.
 *
 * @param bytes - Byte count.
 * @returns Human-readable byte value.
 */
export function formatResourceBytes(bytes: number | null | undefined): string {
    if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes <= 0) {
        return '0 B';
    }

    const exponent = Math.min(BYTE_UNITS.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const value = bytes / Math.pow(1024, exponent);
    const precision = value >= 10 || exponent === 0 ? 0 : 1;

    return `${value.toFixed(precision)} ${BYTE_UNITS[exponent]}`;
}

/**
 * Converts a nullable ratio into a display percentage.
 *
 * @param ratio - Ratio from `0` to `1`.
 * @returns Human-readable percentage or fallback.
 */
export function formatResourcePercentage(ratio: number | null | undefined): string {
    if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) {
        return 'Not available';
    }

    return `${(ratio * 100).toFixed(0)}%`;
}

/**
 * Converts a nullable byte-per-second count into a compact display value.
 *
 * @param bytesPerSecond - Byte count per second.
 * @returns Human-readable rate or fallback.
 */
export function formatResourceRate(bytesPerSecond: number | null | undefined): string {
    if (bytesPerSecond === null || bytesPerSecond === undefined || !Number.isFinite(bytesPerSecond)) {
        return 'Not available';
    }

    return `${formatResourceBytes(bytesPerSecond)}/s`;
}
