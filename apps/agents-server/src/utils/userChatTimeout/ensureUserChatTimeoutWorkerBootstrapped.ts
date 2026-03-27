import { ensureUserChatTimeoutWorkerRunning, kickUserChatTimeoutWorkerTick } from './userChatTimeoutWorker';

/**
 * Guard ensuring the immediate catch-up tick is executed only once per process.
 *
 * @private internal singleton of userChatTimeout
 */
let hasExecutedInitialUserChatTimeoutWorkerKick = false;

/**
 * Starts the timeout worker loop and triggers one immediate catch-up tick.
 *
 * @private internal utility of userChatTimeout
 */
export function ensureUserChatTimeoutWorkerBootstrapped(): void {
    ensureUserChatTimeoutWorkerRunning();

    if (hasExecutedInitialUserChatTimeoutWorkerKick) {
        return;
    }

    hasExecutedInitialUserChatTimeoutWorkerKick = true;
    kickUserChatTimeoutWorkerTick();
}
