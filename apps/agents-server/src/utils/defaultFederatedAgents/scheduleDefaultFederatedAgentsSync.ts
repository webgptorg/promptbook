import type { DefaultFederatedAgentsSyncOptions } from './DefaultFederatedAgentsSyncOptions';
import { synchronizeDefaultFederatedAgents } from './synchronizeDefaultFederatedAgents';

/**
 * Interval between best-effort background sync attempts for one server prefix.
 */
const DEFAULT_FEDERATED_AGENT_SYNC_INTERVAL_MS = 5 * 60_000;

/**
 * In-memory scheduling state for one server prefix.
 */
type DefaultFederatedAgentSyncState = {
    /**
     * Currently running sync promise, if any.
     */
    runningPromise: Promise<void> | null;
    /**
     * Timestamp of the most recent sync attempt.
     */
    lastAttemptAt: number | null;
};

/**
 * Active best-effort sync scheduling state keyed by server table prefix.
 */
const defaultFederatedAgentSyncStateByTablePrefix = new Map<string, DefaultFederatedAgentSyncState>();

/**
 * Schedules a best-effort background synchronization of default Core boilerplate agents.
 *
 * The task is throttled per server prefix and intentionally never throws to callers.
 *
 * @param options - Current server context needed for background sync.
 *
 * @private shared utility for Agents Server
 */
export function scheduleDefaultFederatedAgentsSync(options: DefaultFederatedAgentsSyncOptions): void {
    if (shouldDisableDefaultFederatedAgentsSync()) {
        return;
    }

    const state = getDefaultFederatedAgentSyncState(options.tablePrefix);
    if (state.runningPromise) {
        return;
    }

    if (state.lastAttemptAt !== null && Date.now() - state.lastAttemptAt < DEFAULT_FEDERATED_AGENT_SYNC_INTERVAL_MS) {
        return;
    }

    state.lastAttemptAt = Date.now();
    state.runningPromise = synchronizeDefaultFederatedAgents(options)
        .catch((error) => {
            console.error('[default-federated-agents] Sync failed:', error);
        })
        .finally(() => {
            state.runningPromise = null;
        });
}

/**
 * Reads or creates the in-memory scheduling state for one server prefix.
 *
 * @param tablePrefix - Current server table prefix.
 * @returns Mutable scheduling state.
 */
function getDefaultFederatedAgentSyncState(tablePrefix: string): DefaultFederatedAgentSyncState {
    let state = defaultFederatedAgentSyncStateByTablePrefix.get(tablePrefix);

    if (!state) {
        state = {
            runningPromise: null,
            lastAttemptAt: null,
        };
        defaultFederatedAgentSyncStateByTablePrefix.set(tablePrefix, state);
    }

    return state;
}

/**
 * Returns `true` when background sync should stay disabled in the current runtime.
 *
 * @returns Whether background sync should be skipped.
 */
function shouldDisableDefaultFederatedAgentsSync(): boolean {
    return process.env.NODE_ENV === 'test' || typeof process.env.JEST_WORKER_ID !== 'undefined';
}
