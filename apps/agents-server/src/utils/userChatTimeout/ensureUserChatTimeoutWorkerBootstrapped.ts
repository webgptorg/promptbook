import { ensureUserChatTimeoutWorkerRunning, kickUserChatTimeoutWorkerTick } from './userChatTimeoutWorker';

/**
 * Starts the timeout worker loop and triggers one immediate catch-up tick.
 *
 * @private internal utility of userChatTimeout
 */
export function ensureUserChatTimeoutWorkerBootstrapped(): void {
    ensureUserChatTimeoutWorkerRunning();
    kickUserChatTimeoutWorkerTick();
}
