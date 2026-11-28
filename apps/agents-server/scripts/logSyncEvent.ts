/**
 * Writes one CI-friendly JSON log line.
 *
 * @param level - Log severity.
 * @param event - Stable event name.
 * @param payload - Event payload.
 *
 * @private function of `sync-vercel-domains`
 */
export function logSyncEvent(level: 'info' | 'warn' | 'error', event: string, payload: Record<string, unknown>): void {
    console.log(
        JSON.stringify({
            level,
            event,
            timestamp: new Date().toISOString(),
            ...payload,
        }),
    );
}
