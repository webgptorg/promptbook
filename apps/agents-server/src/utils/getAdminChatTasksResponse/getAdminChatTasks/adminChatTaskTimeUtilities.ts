/**
 * Milliseconds in one hour.
 *
 * @private constant of `getAdminChatTasks`
 */
export const HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

/**
 * Parses one ISO timestamp into milliseconds since epoch.
 *
 * @private function of `getAdminChatTasks`
 */
export function parseIsoTimestamp(timestampIso: string | null): number | null {
    if (!timestampIso) {
        return null;
    }

    const timestamp = Date.parse(timestampIso);
    return Number.isFinite(timestamp) ? timestamp : null;
}

/**
 * Returns whether one ISO timestamp is at or after the given cutoff.
 *
 * @private function of `getAdminChatTasks`
 */
export function isIsoTimestampAtOrAfter(timestampIso: string | null, cutoffTimestamp: number): boolean {
    const timestamp = parseIsoTimestamp(timestampIso);
    return timestamp !== null && timestamp >= cutoffTimestamp;
}
