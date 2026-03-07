import type { RunBrowserModeUsed } from './RunBrowserArgs';

/**
 * In-memory observability counters for browser tool execution.
 */
const RUN_BROWSER_OBSERVABILITY = {
    totalRuns: 0,
    fallbackRuns: 0,
    errorCodeCounts: {} as Record<string, number>,
};

/**
 * Observability counters and metric logging for `run_browser`.
 *
 * @private function of `run_browser`
 */
export const runBrowserObservability = {
    /**
     * Increments total-run counter and returns the updated value.
     */
    incrementTotalRuns(): number {
        RUN_BROWSER_OBSERVABILITY.totalRuns++;
        return RUN_BROWSER_OBSERVABILITY.totalRuns;
    },

    /**
     * Returns current total run count.
     */
    getTotalRuns(): number {
        return RUN_BROWSER_OBSERVABILITY.totalRuns;
    },

    /**
     * Increments fallback counter and returns updated metrics.
     */
    incrementFallbackRunsAndGetMetrics(): { readonly fallbackRuns: number; readonly fallbackRate: number } {
        RUN_BROWSER_OBSERVABILITY.fallbackRuns++;

        return {
            fallbackRuns: RUN_BROWSER_OBSERVABILITY.fallbackRuns,
            fallbackRate: RUN_BROWSER_OBSERVABILITY.totalRuns === 0
                ? 0
                : RUN_BROWSER_OBSERVABILITY.fallbackRuns / RUN_BROWSER_OBSERVABILITY.totalRuns,
        };
    },

    /**
     * Increments one error-code counter and returns the updated value.
     */
    incrementRunBrowserErrorCodeCounter(code: string): number {
        const currentValue = RUN_BROWSER_OBSERVABILITY.errorCodeCounts[code] || 0;
        const nextValue = currentValue + 1;
        RUN_BROWSER_OBSERVABILITY.errorCodeCounts[code] = nextValue;
        return nextValue;
    },

    /**
     * Writes one structured metric line for browser-tool observability.
     */
    logRunBrowserMetric(options: {
        readonly event: string;
        readonly sessionId: string;
        readonly mode: RunBrowserModeUsed;
        readonly payload?: Record<string, unknown>;
    }): void {
        console.info('[run_browser][metric]', {
            tool: 'run_browser',
            mode: options.mode,
            sessionId: options.sessionId,
            event: options.event,
            ...(options.payload || {}),
        });
    },
};
