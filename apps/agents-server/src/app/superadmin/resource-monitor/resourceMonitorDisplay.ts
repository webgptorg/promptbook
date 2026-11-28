/**
 * Formats the server resource monitor measurement timestamp.
 *
 * @param measuredAt - ISO timestamp.
 * @returns Display value.
 * @private internal helper of `/superadmin/resource-monitor`
 */
export function formatResourceMonitorMeasuredAt(measuredAt: string): string {
    return new Date(measuredAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'medium',
    });
}
