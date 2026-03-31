import { DEFAULT_USER_CHAT_BACKGROUND_WORKER_INTERVAL_MS } from '@/src/constants/userChatBackgroundWorker';
import { claimNextQueuedUserChatJob } from './claimNextQueuedUserChatJob';
import { finalizeUserChatJob } from './finalizeUserChatJob';
import { loadUserChatBackgroundWorkerIntervalMs } from './loadUserChatBackgroundWorkerIntervalMs';
import { persistUserChatJobTerminalState } from './persistUserChatJobTerminalState';
import { recoverExpiredRunningUserChatJobs } from './recoverExpiredRunningUserChatJobs';
import { runUserChatJob } from './runUserChatJob';

/**
 * Guard preventing overlapping in-process background worker ticks.
 *
 * @private singleton of `userChatJobBackgroundWorker`
 */
let isUserChatJobBackgroundWorkerTickRunning = false;

/**
 * Registered in-process background worker interval id.
 *
 * @private singleton of `userChatJobBackgroundWorker`
 */
let userChatJobBackgroundWorkerIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Returns true when the current runtime should avoid starting long-lived worker intervals.
 *
 * @private internal utility of `userChatJobBackgroundWorker`
 */
function shouldDisableBackgroundWorkerLoop(): boolean {
    if (process.env.NODE_ENV === 'test') {
        return true;
    }

    if (typeof process.env.JEST_WORKER_ID !== 'undefined') {
        return true;
    }

    return false;
}

/**
 * Detects missing durable chat-job table errors during early bootstrap states.
 *
 * @private internal utility of `userChatJobBackgroundWorker`
 */
function isMissingUserChatJobTableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false;
    }

    const normalizedMessage = error.message.toLowerCase();

    return (
        normalizedMessage.includes('relation') &&
        normalizedMessage.includes('does not exist') &&
        normalizedMessage.includes('userchatjob')
    );
}

/**
 * Runs one in-process background worker tick that claims and executes a single durable chat job.
 *
 * This is the in-process counterpart to the HTTP worker route at `/api/internal/user-chat-jobs/run`.
 * Running jobs directly in-process avoids HTTP self-call reliability issues that can cause tasks
 * to get stuck in QUEUED state when the HTTP trigger fails silently.
 *
 * @param options.preferredJobId - When provided, only this specific job will be claimed.
 * @param options.queuedBefore - ISO timestamp cutoff; only jobs queued before this time are considered.
 *
 * @private internal utility of `userChatJobBackgroundWorker`
 */
export async function runUserChatJobBackgroundWorkerTick(
    options: {
        preferredJobId?: string;
        queuedBefore?: string;
    } = {},
): Promise<void> {
    if (isUserChatJobBackgroundWorkerTickRunning) {
        return;
    }

    isUserChatJobBackgroundWorkerTickRunning = true;

    try {
        await recoverExpiredRunningUserChatJobs();

        const claimedJob = await claimNextQueuedUserChatJob(options);

        if (!claimedJob) {
            return;
        }

        try {
            await runUserChatJob(claimedJob);
        } catch (error) {
            const failureReason = error instanceof Error ? error.message : 'Chat generation failed.';

            console.error('[user-chat-job] unexpected in-process background worker failure', {
                chatId: claimedJob.chatId,
                messageId: claimedJob.userMessageId,
                jobId: claimedJob.id,
                error,
            });

            await persistUserChatJobTerminalState({
                job: claimedJob,
                status: 'FAILED',
                failureReason,
            }).catch(async () => {
                await finalizeUserChatJob({
                    jobId: claimedJob.id,
                    status: 'FAILED',
                    failureReason,
                });
            });
        }

        // Chain: immediately process the next queued job (if any)
        kickUserChatJobBackgroundWorkerTick({ queuedBefore: options.queuedBefore });
    } catch (error) {
        if (isMissingUserChatJobTableError(error)) {
            // Tables not yet migrated – silently skip
            return;
        }

        console.error('[user-chat-job] in-process background worker tick failed', error);
    } finally {
        isUserChatJobBackgroundWorkerTickRunning = false;
    }
}

/**
 * Triggers one best-effort in-process worker tick for background periodic catch-up.
 *
 * Uses the configured background interval as a `queuedBefore` cutoff so only stale
 * jobs (those that the interactive trigger failed to start) are claimed here.
 *
 * @private internal utility of `userChatJobBackgroundWorker`
 */
async function runBackgroundIntervalTick(): Promise<void> {
    try {
        const intervalMs = await loadUserChatBackgroundWorkerIntervalMs();
        const queuedBefore = new Date(Date.now() - intervalMs).toISOString();

        await runUserChatJobBackgroundWorkerTick({ queuedBefore });
    } catch (error) {
        console.error('[user-chat-job] background interval tick failed', error);
    }
}

/**
 * Triggers one immediate in-process worker tick without a `queuedBefore` filter.
 *
 * Intended for interactive contexts (message sent, stream detects queued job) where
 * the job should start as soon as possible regardless of how long it has been queued.
 *
 * @param preferredJobId - When provided, this specific job is targeted first.
 *
 * @public exported from Agents Server utils
 */
export function kickUserChatJobInteractiveWorkerTick(preferredJobId?: string): void {
    if (shouldDisableBackgroundWorkerLoop()) {
        return;
    }

    void runUserChatJobBackgroundWorkerTick({ preferredJobId });
}

/**
 * Triggers one in-process background worker tick (with optional filters).
 *
 * @private internal utility of `userChatJobBackgroundWorker`
 */
export function kickUserChatJobBackgroundWorkerTick(
    options: { preferredJobId?: string; queuedBefore?: string } = {},
): void {
    if (shouldDisableBackgroundWorkerLoop()) {
        return;
    }

    void runUserChatJobBackgroundWorkerTick(options);
}

/**
 * Starts the in-process periodic background worker loop for durable chat jobs.
 *
 * This supplements the Vercel cron route (`GET /api/internal/user-chat-jobs/run`) and
 * acts as the ONLY background mechanism in local development where Vercel cron is absent.
 *
 * The interval is driven by `DEFAULT_USER_CHAT_BACKGROUND_WORKER_INTERVAL_MS` (default 2 minutes)
 * and can be overridden via the `USER_CHAT_BACKGROUND_WORKER_INTERVAL_MS` metadata key.
 *
 * Safe to call multiple times – only one interval is ever registered.
 *
 * @public exported from Agents Server utils
 */
export function ensureUserChatJobBackgroundWorkerRunning(): void {
    if (shouldDisableBackgroundWorkerLoop()) {
        return;
    }

    if (userChatJobBackgroundWorkerIntervalId !== null) {
        return;
    }

    userChatJobBackgroundWorkerIntervalId = setInterval(() => {
        void runBackgroundIntervalTick();
    }, DEFAULT_USER_CHAT_BACKGROUND_WORKER_INTERVAL_MS);

    // Allow the Node.js process to exit normally even while the interval is active
    userChatJobBackgroundWorkerIntervalId.unref?.();
}
