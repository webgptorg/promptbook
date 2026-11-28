/**
 * Returns true when one periodic background task should run now.
 */
export function shouldRunPeriodicTask(options: {
    readonly lastRunTimestamp: number | undefined;
    readonly intervalMs: number;
}): boolean {
    const { lastRunTimestamp, intervalMs } = options;

    if (lastRunTimestamp === undefined) {
        return true;
    }

    return Date.now() - lastRunTimestamp >= intervalMs;
}
