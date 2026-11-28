import { randomUUID } from 'crypto';
import { REMOTE_BROWSER_URL } from '../../config';
import type { RunBrowserArgs, RunBrowserExecutionMode, RunBrowserTimeoutConfiguration } from './RunBrowserArgs';
import { runBrowserConstants } from './runBrowserConstants';

/**
 * Reads a positive integer value from environment variables.
 */
function resolvePositiveIntFromEnv(variableName: string, defaultValue: number): number {
    const rawValue = process.env[variableName];
    if (!rawValue || !rawValue.trim()) {
        return defaultValue;
    }

    const parsed = Number.parseInt(rawValue.trim(), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return defaultValue;
    }

    return parsed;
}

/**
 * Runtime helpers for mode/session/timeout handling in `run_browser`.
 *
 * @private function of `run_browser`
 */
export const runBrowserRuntime = {
    /**
     * Creates a dedicated session id for one tool invocation.
     */
    createRunBrowserSessionId(): string {
        return `${runBrowserConstants.sessionPrefix}-${randomUUID()}`;
    },

    /**
     * Determines whether the browser tool is running in local or remote mode.
     */
    resolveExecutionMode(): RunBrowserExecutionMode {
        return REMOTE_BROWSER_URL && REMOTE_BROWSER_URL.trim().length > 0 ? 'remote' : 'local';
    },

    /**
     * Converts the execution mode into a human-readable label.
     */
    formatExecutionMode(mode: RunBrowserExecutionMode): string {
        return mode === 'remote' ? 'remote-browser' : 'local-browser';
    },

    /**
     * Resolves timeout configuration from env defaults and optional call overrides.
     */
    resolveTimeoutConfiguration(overrides: RunBrowserArgs['timeouts'] | undefined): RunBrowserTimeoutConfiguration {
        const envNavigationTimeoutMs = resolvePositiveIntFromEnv(
            'RUN_BROWSER_NAVIGATION_TIMEOUT_MS',
            runBrowserConstants.defaultNavigationTimeoutMs,
        );
        const envActionTimeoutMs = resolvePositiveIntFromEnv(
            'RUN_BROWSER_ACTION_TIMEOUT_MS',
            runBrowserConstants.defaultActionTimeoutMs,
        );

        const navigationTimeoutMs =
            overrides?.navigationMs && Number.isFinite(overrides.navigationMs) && overrides.navigationMs > 0
                ? Math.floor(overrides.navigationMs)
                : envNavigationTimeoutMs;
        const actionTimeoutMs =
            overrides?.actionMs && Number.isFinite(overrides.actionMs) && overrides.actionMs > 0
                ? Math.floor(overrides.actionMs)
                : envActionTimeoutMs;

        return {
            navigationTimeoutMs,
            actionTimeoutMs,
        };
    },
};
