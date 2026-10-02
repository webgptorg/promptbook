import type { PromptRunner } from '../runners/types/PromptRunner';
import type { CoderRunUiState } from './CoderRunUiState';
import { refreshCoderRunUiSubscriptionUsage } from './refreshCoderRunUiSubscriptionUsage';

/**
 * How often the harness subscription usage is re-read while `ptbk coder` is running.
 *
 * @private internal constant of coder run UI
 */
export const CODER_RUN_SUBSCRIPTION_USAGE_REFRESH_INTERVAL_MS = 5 * 1000;

/**
 * Stops the periodic subscription-usage refresh of one coder run.
 *
 * @private internal type of coder run UI
 */
export type CoderRunUiSubscriptionUsageRefreshHandle = {
    /**
     * Ends the refresh, after which the dashboard keeps the last read values.
     */
    stop(): void;
};

/**
 * Keeps the harness subscription usage of the coder-run dashboard current for the whole run.
 *
 * A single coding prompt can take hours, so reading the usage once per prompt leaves the dashboard showing values
 * which are long out of date. Reading it on its own clock instead means the percentages and reset countdowns always
 * describe the present moment, no matter how long the current prompt runs.
 *
 * Refreshes never overlap: a read which is still in flight when the next tick arrives simply skips that tick, so a
 * slow or hanging harness cannot pile up requests. The whole refresh is optional dashboard information, so a harness
 * without subscription limits and a run without a dashboard start no timer at all.
 *
 * @private internal utility of coder run UI
 */
export function startCoderRunUiSubscriptionUsageRefresh(options: {
    readonly runner: PromptRunner;
    readonly uiState: CoderRunUiState | undefined;
    readonly refreshIntervalMs?: number;
}): CoderRunUiSubscriptionUsageRefreshHandle {
    const { runner, uiState, refreshIntervalMs = CODER_RUN_SUBSCRIPTION_USAGE_REFRESH_INTERVAL_MS } = options;

    if (!uiState || !runner.getSubscriptionUsage) {
        return { stop: () => {} };
    }

    let isRefreshing = false;

    /**
     * Reads one fresh snapshot unless the previous read has not finished yet.
     */
    const refreshSubscriptionUsage = (): void => {
        if (isRefreshing) {
            return;
        }

        isRefreshing = true;
        void refreshCoderRunUiSubscriptionUsage({ runner, uiState }).finally(() => {
            isRefreshing = false;
        });
    };

    // Note: The dashboard shows the usage from its very first frames on instead of waiting out one whole interval
    refreshSubscriptionUsage();

    const refreshInterval = setInterval(refreshSubscriptionUsage, refreshIntervalMs);

    // Note: Optional dashboard information must never keep the `ptbk coder` process alive after the queue is done
    refreshInterval.unref?.();

    return {
        stop(): void {
            clearInterval(refreshInterval);
        },
    };
}
