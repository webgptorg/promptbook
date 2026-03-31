import {
    ensureUserChatJobBackgroundWorkerRunning,
    kickUserChatJobInteractiveWorkerTick,
} from './userChatJobBackgroundWorker';

/**
 * Guard ensuring the initial catch-up tick is executed only once per process.
 *
 * @private internal singleton of `userChatJobBackgroundWorker`
 */
let hasExecutedInitialUserChatJobWorkerKick = false;

/**
 * Starts the in-process background worker loop and triggers one immediate catch-up tick.
 *
 * Mirrors the pattern used by `ensureUserChatTimeoutWorkerBootstrapped` for timeout processing.
 * Call this once from a request-scoped function (e.g., `resolveUserChatScope`) so the worker
 * is guaranteed to be running within the first user-chat interaction.
 *
 * @public exported from Agents Server utils
 */
export function ensureUserChatJobBackgroundWorkerBootstrapped(): void {
    ensureUserChatJobBackgroundWorkerRunning();

    if (hasExecutedInitialUserChatJobWorkerKick) {
        return;
    }

    hasExecutedInitialUserChatJobWorkerKick = true;

    // Fire one immediate tick on bootstrap (no queuedBefore filter) to recover any
    // jobs that were stuck in QUEUED state before this process started.
    kickUserChatJobInteractiveWorkerTick();
}
