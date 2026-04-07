import type { UserChatJobRecord } from './UserChatJobRecord';

/**
 * Default cadence for renewing one running durable chat-job lease.
 *
 * @private function of `userChat`
 */
export const DEFAULT_USER_CHAT_JOB_HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Default maximum number of consecutive heartbeat failures tolerated before aborting the job.
 *
 * @private function of `userChat`
 */
export const DEFAULT_USER_CHAT_JOB_HEARTBEAT_MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Minimal running-job snapshot returned from one heartbeat renewal.
 */
export type UserChatJobHeartbeatSnapshot = Pick<UserChatJobRecord, 'cancelRequestedAt'> | null;

/**
 * Persists one lease renewal for a running durable chat job.
 */
export type UserChatJobHeartbeat = (jobId: string) => Promise<UserChatJobHeartbeatSnapshot>;

/**
 * Options configuring one running durable chat-job heartbeat controller.
 */
export type CreateUserChatJobHeartbeatControllerOptions = {
    jobId: string;
    heartbeat: UserChatJobHeartbeat;
    intervalMs?: number;
    maxConsecutiveFailures?: number;
    onCancellationRequested: () => void;
    onHeartbeatFailure?: (error: unknown, consecutiveFailures: number) => void | Promise<void>;
    onFailureLimitReached: (error: unknown) => void;
};

/**
 * Handle controlling one background lease-renewal loop.
 */
export type UserChatJobHeartbeatController = {
    stop: () => void;
    whenIdle: () => Promise<void>;
};

/**
 * Starts a serialized heartbeat loop that renews one running durable chat-job lease.
 *
 * The controller keeps heartbeat renewals independent from unrelated persistence work while
 * still preventing overlapping heartbeat writes for the same job.
 */
export function createUserChatJobHeartbeatController(
    options: CreateUserChatJobHeartbeatControllerOptions,
): UserChatJobHeartbeatController {
    const intervalMs = Math.max(1, options.intervalMs ?? DEFAULT_USER_CHAT_JOB_HEARTBEAT_INTERVAL_MS);
    const maxConsecutiveFailures = Math.max(
        1,
        options.maxConsecutiveFailures ?? DEFAULT_USER_CHAT_JOB_HEARTBEAT_MAX_CONSECUTIVE_FAILURES,
    );
    let consecutiveFailures = 0;
    let isStopped = false;
    let heartbeatQueue: Promise<void> = Promise.resolve();

    /**
     * Queues the next serialized heartbeat renewal.
     *
     * @private function of `createUserChatJobHeartbeatController`
     */
    const queueHeartbeat = (): void => {
        if (isStopped) {
            return;
        }

        heartbeatQueue = heartbeatQueue
            .then(async () => {
                if (isStopped) {
                    return;
                }

                const nextJob = await options.heartbeat(options.jobId);
                if (isStopped) {
                    return;
                }

                consecutiveFailures = 0;

                if (!nextJob || nextJob.cancelRequestedAt) {
                    options.onCancellationRequested();
                }
            })
            .catch(async (error) => {
                if (isStopped) {
                    return;
                }

                consecutiveFailures += 1;
                await options.onHeartbeatFailure?.(error, consecutiveFailures);

                if (isStopped) {
                    return;
                }

                if (consecutiveFailures >= maxConsecutiveFailures) {
                    options.onFailureLimitReached(error);
                }
            });
    };

    const heartbeatTimer = setInterval(queueHeartbeat, intervalMs);
    heartbeatTimer.unref?.();

    return {
        stop: () => {
            if (isStopped) {
                return;
            }

            isStopped = true;
            clearInterval(heartbeatTimer);
        },
        whenIdle: () => heartbeatQueue,
    };
}
