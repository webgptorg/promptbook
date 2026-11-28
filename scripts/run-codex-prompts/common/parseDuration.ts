/**
 * Pattern that matches durations like "1h", "30m", "5s", "1h30m", "1h30m5s".
 */
const DURATION_PATTERN = /^(?:(\d+)h)?(?:(\d+)m(?:in)?)?(?:(\d+)s)?$/;

/**
 * Parses a human-readable duration string into milliseconds.
 *
 * Supported formats: `Xh`, `Xm`, `Xs`, and combinations like `1h30m`, `1h30m5s`.
 *
 * @returns Duration in milliseconds
 * @throws When the string does not match any supported format
 *
 * @private internal utility of `ptbk coder run`
 */
export function parseDuration(durationString: string): number {
    const trimmed = durationString.trim();

    if (!trimmed) {
        throw new Error(`Invalid duration: empty string. Expected a format like "1h", "30m", "5s", or combinations like "1h30m".`);
    }

    const match = trimmed.match(DURATION_PATTERN);

    if (!match || (match[1] === undefined && match[2] === undefined && match[3] === undefined)) {
        throw new Error(
            `Invalid duration: "${durationString}". Expected a format like "1h", "30m", "5s", or combinations like "1h30m5s".`,
        );
    }

    const hours = parseInt(match[1] ?? '0', 10);
    const minutes = parseInt(match[2] ?? '0', 10);
    const seconds = parseInt(match[3] ?? '0', 10);

    return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

/**
 * Formats a duration in milliseconds into a compact human-readable string.
 *
 * Examples: `3600000` → `"1h"`, `90000` → `"1m 30s"`, `5000` → `"5s"`.
 *
 * @private internal utility of `ptbk coder run`
 */
export function formatDurationMs(ms: number): string {
    const totalSeconds = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(' ');
}
