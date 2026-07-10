/**
 * Waits for a short sampling interval between resource counter reads.
 *
 * @param durationMs - Sampling duration in milliseconds.
 * @returns Promise resolved after the duration elapses.
 */
export function waitForResourceMonitorSample(durationMs: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, Math.max(0, durationMs));
    });
}
