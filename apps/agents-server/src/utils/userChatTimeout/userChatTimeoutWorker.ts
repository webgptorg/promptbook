import { NEXT_PUBLIC_SITE_URL } from '@/config';
import { LimitReachedError } from '@promptbook-local/core';
import type { ChatMessage } from '@promptbook-local/types';
import { serializeError, spaceTrim } from '@promptbook-local/utils';
import { $randomBase58 } from '../../../../../src/utils/random/$randomBase58';
import { getToolUsageLimits } from '../toolUsageLimits';
import { appendQueuedUserChatTurn } from '../userChat/appendQueuedUserChatTurn';
import { getUserChat } from '../userChat/getUserChat';
import { getUserChatJobByClientMessageId } from '../userChat/getUserChatJobByClientMessageId';
import { mutateUserChat } from '../userChat/mutateUserChat';
import { triggerUserChatJobWorker } from '../userChat/triggerUserChatJobWorker';
import type { UserChatTimeoutParameters, UserChatTimeoutRecord } from './UserChatTimeoutRecord';
import { createTimeoutWakeUpMessage } from './createTimeoutWakeUpMessage';
import {
    cancelUserChatTimeout,
    claimNextDueUserChatTimeout,
    countActiveUserChatTimeoutsForChat,
    countCompletedUserChatTimeoutsForChatSince,
    createUserChatTimeout,
    getUserChatTimeoutById,
    markUserChatTimeoutCancelled,
    markUserChatTimeoutCompleted,
    markUserChatTimeoutFailed,
    recoverExpiredRunningUserChatTimeouts,
} from './userChatTimeoutStore';

/**
 * Poll interval for the background timeout worker loop.
 *
 * @private internal utility of userChatTimeout
 */
const USER_CHAT_TIMEOUT_WORKER_INTERVAL_MS = 5_000;

/**
 * Maximum number of due timeouts processed in one worker tick.
 *
 * @private internal utility of userChatTimeout
 */
const USER_CHAT_TIMEOUT_MAX_JOBS_PER_TICK = 20;

/**
 * Maximum timeout duration handled by best-effort in-process wake-up timers.
 *
 * @private internal utility of userChatTimeout
 */
const USER_CHAT_TIMEOUT_LOCAL_WAKEUP_MAX_MS = 5 * 60_000;

/**
 * Small wake-up buffer used when scheduling local timer kicks.
 *
 * @private internal utility of userChatTimeout
 */
const USER_CHAT_TIMEOUT_WAKEUP_BUFFER_MS = 150;

/**
 * Prefix used for synthetic timeout-triggered client message ids.
 *
 * @private internal utility of userChatTimeout
 */
const USER_CHAT_TIMEOUT_CLIENT_MESSAGE_ID_PREFIX = 'timeout:';

/**
 * Length of generated transcript warning message ids.
 *
 * @private internal utility of userChatTimeout
 */
const USER_CHAT_TIMEOUT_WARNING_MESSAGE_ID_LENGTH = 14;

/**
 * Singleton interval handle for the timeout worker.
 *
 * @private internal singleton of userChatTimeout
 */
let userChatTimeoutWorkerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * One-shot local wake-up timers keyed by timeout id.
 *
 * @private internal singleton of userChatTimeout
 */
const userChatTimeoutWakeupsById = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Guard preventing overlapping timeout worker ticks.
 *
 * @private internal singleton of userChatTimeout
 */
let isUserChatTimeoutWorkerTickRunning = false;

/**
 * Schedules one durable thread-scoped timeout and applies rate limits.
 *
 * @private internal utility of userChatTimeout
 */
export async function scheduleThreadScopedUserChatTimeout(options: {
    readonly userId: number;
    readonly agentPermanentId: string;
    readonly chatId: string;
    readonly durationMs: number;
    readonly message?: string;
    readonly parameters?: UserChatTimeoutParameters;
}): Promise<UserChatTimeoutRecord> {
    const limits = await getToolUsageLimits();
    const activeTimeoutsCount = await countActiveUserChatTimeoutsForChat(options.chatId);

    if (activeTimeoutsCount >= limits.timeout.maxActivePerChat) {
        throw new LimitReachedError(
            spaceTrim(`
                Timeout limit reached for this chat.

                - Maximum active timers per chat: \`${limits.timeout.maxActivePerChat}\`
            `),
        );
    }

    const timeout = await createUserChatTimeout({
        userId: options.userId,
        agentPermanentId: options.agentPermanentId,
        chatId: options.chatId,
        durationMs: options.durationMs,
        message: options.message,
        parameters: options.parameters,
    });

    console.info('[user-chat-timeout]', 'set', {
        chatId: timeout.chatId,
        timeoutId: timeout.timeoutId,
        dueAt: timeout.dueAt,
        durationMs: timeout.durationMs,
    });

    ensureUserChatTimeoutWorkerRunning();
    scheduleUserChatTimeoutLocalWakeup(timeout);

    return timeout;
}

/**
 * Cancels one scheduled timeout and clears any best-effort local wake-up.
 *
 * @private internal utility of userChatTimeout
 */
export async function cancelScheduledUserChatTimeout(timeoutId: string): Promise<UserChatTimeoutRecord | null> {
    const cancelledTimeout = await cancelUserChatTimeout(timeoutId);
    clearUserChatTimeoutLocalWakeup(timeoutId);

    if (cancelledTimeout) {
        console.info('[user-chat-timeout]', 'cancel', {
            chatId: cancelledTimeout.chatId,
            timeoutId: cancelledTimeout.timeoutId,
            status: cancelledTimeout.status,
            cancelRequestedAt: cancelledTimeout.cancelRequestedAt,
        });
    }

    return cancelledTimeout;
}

/**
 * Starts the singleton timeout worker loop if it is not already running.
 *
 * @private internal utility of userChatTimeout
 */
export function ensureUserChatTimeoutWorkerRunning(): void {
    if (shouldDisableBackgroundWorkerLoop()) {
        return;
    }

    if (userChatTimeoutWorkerInterval) {
        return;
    }

    userChatTimeoutWorkerInterval = setInterval(() => {
        void runUserChatTimeoutWorkerTick();
    }, USER_CHAT_TIMEOUT_WORKER_INTERVAL_MS);

    userChatTimeoutWorkerInterval.unref?.();
}

/**
 * Triggers one immediate best-effort worker tick.
 *
 * @private internal utility of userChatTimeout
 */
export function kickUserChatTimeoutWorkerTick(): void {
    if (shouldDisableBackgroundWorkerLoop()) {
        return;
    }

    void runUserChatTimeoutWorkerTick();
}

/**
 * Runs one timeout worker tick without overlap.
 *
 * @private internal utility of userChatTimeout
 */
export async function runUserChatTimeoutWorkerTick(): Promise<void> {
    if (isUserChatTimeoutWorkerTickRunning) {
        return;
    }

    isUserChatTimeoutWorkerTickRunning = true;

    try {
        await recoverExpiredRunningUserChatTimeouts();

        for (let index = 0; index < USER_CHAT_TIMEOUT_MAX_JOBS_PER_TICK; index++) {
            const claimedTimeout = await claimNextDueUserChatTimeout();

            if (!claimedTimeout) {
                break;
            }

            await processClaimedUserChatTimeout(claimedTimeout);
        }
    } catch (error) {
        console.error('[user-chat-timeout]', 'worker_tick_failed', serializeError(error as Error));
    } finally {
        isUserChatTimeoutWorkerTickRunning = false;
    }
}

/**
 * Processes one claimed due timeout row.
 *
 * @private internal utility of userChatTimeout
 */
async function processClaimedUserChatTimeout(timeout: UserChatTimeoutRecord): Promise<void> {
    clearUserChatTimeoutLocalWakeup(timeout.timeoutId);

    try {
        const latestTimeout = await getUserChatTimeoutById(timeout.timeoutId);

        if (!latestTimeout) {
            return;
        }

        if (latestTimeout.cancelRequestedAt || latestTimeout.status === 'CANCELLED') {
            await markUserChatTimeoutCancelled(latestTimeout.timeoutId);
            return;
        }

        const chat = await getUserChat({
            userId: latestTimeout.userId,
            agentPermanentId: latestTimeout.agentPermanentId,
            chatId: latestTimeout.chatId,
        });

        if (!chat) {
            await markUserChatTimeoutCancelled(
                latestTimeout.timeoutId,
                'Timeout was dropped because the chat is no longer available.',
            );
            return;
        }

        const limits = await getToolUsageLimits();
        const completedTimeoutsTodayCount = await countCompletedUserChatTimeoutsForChatSince(
            latestTimeout.chatId,
            createStartOfCurrentUtcDayIso(),
        );

        if (completedTimeoutsTodayCount >= limits.timeout.maxFiredPerDayPerChat) {
            const failureReason = `Timeout daily firing limit reached (${limits.timeout.maxFiredPerDayPerChat} per day).`;
            await markUserChatTimeoutFailed(latestTimeout.timeoutId, failureReason);
            await appendUserChatTimeoutWarningMessage(latestTimeout, failureReason);
            console.warn('[user-chat-timeout]', 'daily_limit_reached', {
                chatId: latestTimeout.chatId,
                timeoutId: latestTimeout.timeoutId,
            });
            return;
        }

        const timeoutClientMessageId = createTimeoutClientMessageId(latestTimeout.timeoutId);
        let queuedJob = await getUserChatJobByClientMessageId({
            userId: latestTimeout.userId,
            agentPermanentId: latestTimeout.agentPermanentId,
            chatId: latestTimeout.chatId,
            clientMessageId: timeoutClientMessageId,
        });

        if (!queuedJob) {
            try {
                const enqueuedTurn = await appendQueuedUserChatTurn({
                    userId: latestTimeout.userId,
                    agentPermanentId: latestTimeout.agentPermanentId,
                    chatId: latestTimeout.chatId,
                    clientMessageId: timeoutClientMessageId,
                    messageContent: createTimeoutWakeUpMessage({
                        timeoutId: latestTimeout.timeoutId,
                        durationMs: latestTimeout.durationMs,
                        message: latestTimeout.message,
                    }),
                    parameters: latestTimeout.parameters,
                });
                queuedJob = enqueuedTurn.job;
            } catch (error) {
                if (!isDuplicateUserChatJobError(error)) {
                    throw error;
                }

                queuedJob = await getUserChatJobByClientMessageId({
                    userId: latestTimeout.userId,
                    agentPermanentId: latestTimeout.agentPermanentId,
                    chatId: latestTimeout.chatId,
                    clientMessageId: timeoutClientMessageId,
                });
            }
        }

        if (!queuedJob) {
            throw new Error(`Failed to resolve queued timeout wake-up job for "${latestTimeout.timeoutId}".`);
        }

        try {
            await triggerUserChatJobWorker({
                origin: resolveLocalServerOrigin(),
                preferredJobId: queuedJob.id,
            });
        } catch (error) {
            const failureReason = error instanceof Error ? error.message : 'Failed to trigger timeout wake-up job.';
            await markUserChatTimeoutFailed(latestTimeout.timeoutId, failureReason);
            await appendUserChatTimeoutWarningMessage(latestTimeout, failureReason);
            console.error('[user-chat-timeout]', 'trigger_failed', {
                chatId: latestTimeout.chatId,
                timeoutId: latestTimeout.timeoutId,
                jobId: queuedJob.id,
                error: serializeError(error as Error),
            });
            return;
        }

        await markUserChatTimeoutCompleted(latestTimeout.timeoutId);

        console.info('[user-chat-timeout]', 'fired', {
            chatId: latestTimeout.chatId,
            timeoutId: latestTimeout.timeoutId,
            dueAt: latestTimeout.dueAt,
            jobId: queuedJob.id,
        });
    } catch (error) {
        const failureReason = error instanceof Error ? error.message : 'Timeout execution failed.';
        await markUserChatTimeoutFailed(timeout.timeoutId, failureReason).catch(() => undefined);
        await appendUserChatTimeoutWarningMessage(timeout, failureReason).catch(() => undefined);
        console.error('[user-chat-timeout]', 'failed', {
            chatId: timeout.chatId,
            timeoutId: timeout.timeoutId,
            error: serializeError(error as Error),
        });
    }
}

/**
 * Appends one transcript warning when a timeout could not be executed.
 *
 * @private internal utility of userChatTimeout
 */
async function appendUserChatTimeoutWarningMessage(timeout: UserChatTimeoutRecord, failureReason: string): Promise<void> {
    const chat = await getUserChat({
        userId: timeout.userId,
        agentPermanentId: timeout.agentPermanentId,
        chatId: timeout.chatId,
    });

    if (!chat) {
        return;
    }

    const warningContent = `⚠️ Scheduled timeout ${timeout.timeoutId} could not be executed: ${failureReason}`;
    const lastMessageContent = chat.messages[chat.messages.length - 1]?.content || '';

    if (lastMessageContent === warningContent) {
        return;
    }

    const nowIso = new Date().toISOString() as NonNullable<ChatMessage['createdAt']>;
    await mutateUserChat({
        userId: timeout.userId,
        agentPermanentId: timeout.agentPermanentId,
        chatId: timeout.chatId,
        mutate: (currentChat) => ({
            messages: [
                ...currentChat.messages,
                {
                    id: $randomBase58(USER_CHAT_TIMEOUT_WARNING_MESSAGE_ID_LENGTH),
                    sender: 'AGENT',
                    content: warningContent,
                    createdAt: nowIso,
                    isComplete: true,
                    lifecycleState: 'completed',
                },
            ],
            lastMessageAt: nowIso,
        }),
    });
}

/**
 * Schedules one best-effort local wake-up for short-running timers.
 *
 * @private internal utility of userChatTimeout
 */
function scheduleUserChatTimeoutLocalWakeup(timeout: UserChatTimeoutRecord): void {
    if (shouldDisableBackgroundWorkerLoop()) {
        return;
    }

    const dueAtTimestamp = new Date(timeout.dueAt).getTime();
    const delayMs = dueAtTimestamp - Date.now();

    if (!Number.isFinite(delayMs) || delayMs < 0 || delayMs > USER_CHAT_TIMEOUT_LOCAL_WAKEUP_MAX_MS) {
        return;
    }

    clearUserChatTimeoutLocalWakeup(timeout.timeoutId);

    const wakeup = setTimeout(() => {
        userChatTimeoutWakeupsById.delete(timeout.timeoutId);
        kickUserChatTimeoutWorkerTick();
    }, delayMs + USER_CHAT_TIMEOUT_WAKEUP_BUFFER_MS);

    wakeup.unref?.();
    userChatTimeoutWakeupsById.set(timeout.timeoutId, wakeup);
}

/**
 * Clears one pending best-effort local wake-up timer.
 *
 * @private internal utility of userChatTimeout
 */
function clearUserChatTimeoutLocalWakeup(timeoutId: string): void {
    const wakeup = userChatTimeoutWakeupsById.get(timeoutId);

    if (!wakeup) {
        return;
    }

    clearTimeout(wakeup);
    userChatTimeoutWakeupsById.delete(timeoutId);
}

/**
 * Returns true when the runtime should avoid long-lived worker loops.
 *
 * @private internal utility of userChatTimeout
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
 * Builds the synthetic client message id used for timeout wake-ups.
 *
 * @private internal utility of userChatTimeout
 */
function createTimeoutClientMessageId(timeoutId: string): string {
    return `${USER_CHAT_TIMEOUT_CLIENT_MESSAGE_ID_PREFIX}${timeoutId}`;
}

/**
 * Creates the UTC timestamp representing the start of the current day.
 *
 * @private internal utility of userChatTimeout
 */
function createStartOfCurrentUtcDayIso(): string {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

/**
 * Resolves the local/public server origin used for internal worker wake-ups.
 *
 * @private internal utility of userChatTimeout
 */
function resolveLocalServerOrigin(): string {
    if (NEXT_PUBLIC_SITE_URL instanceof URL) {
        return NEXT_PUBLIC_SITE_URL.href.replace(/\/+$/g, '');
    }

    return 'https://localhost:4440';
}

/**
 * Detects duplicate chat-job enqueue failures so timeout retries stay idempotent.
 *
 * @private internal utility of userChatTimeout
 */
function isDuplicateUserChatJobError(error: unknown): boolean {
    return error instanceof Error && error.name === 'UserChatJobDuplicateError';
}
