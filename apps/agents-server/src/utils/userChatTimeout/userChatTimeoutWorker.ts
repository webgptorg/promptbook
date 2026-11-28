import { LimitReachedError } from '@promptbook-local/core';
import type { ChatMessage } from '@promptbook-local/types';
import { serializeError, spaceTrim } from '@promptbook-local/utils';
import { $randomBase58 } from '../../../../../src/utils/random/$randomBase58';
import { appendAgentGoalChatNote } from '../agentGoalChat/appendAgentGoalChatNote';
import { isAgentGoalChatId } from '../agentGoalChat/agentGoalChatIdentity';
import {
    createAgentGoalChatCancelledPlannedMessageNoteContent,
    createAgentGoalChatPlannedMessageNoteContent,
    createAgentGoalChatUpdatedPlannedMessageNoteContent,
    type AgentGoalChatPlannedMessageNoteOptions,
} from '../agentGoalChat/createAgentGoalChatNoteContent';
import { getToolUsageLimits } from '../toolUsageLimits';
import { resolveCurrentOrInternalServerOrigin } from '../resolveCurrentOrInternalServerOrigin';
import { sendUserChatPushNotification } from '../sendUserChatPushNotification';
import { appendQueuedUserChatTurn } from '../userChat/appendQueuedUserChatTurn';
import { getUserChat } from '../userChat/getUserChat';
import { getUserChatJobByClientMessageId } from '../userChat/getUserChatJobByClientMessageId';
import { mutateUserChat } from '../userChat/mutateUserChat';
import { triggerUserChatJobWorker } from '../userChat/triggerUserChatJobWorker';
import { runWithTaskTerminalCapture } from '../taskTerminal/runWithTaskTerminalCapture';
import type {
    UpdateAgentScopedUserChatTimeoutOptions,
    UserChatTimeoutParameters,
    UserChatTimeoutRecord,
} from './UserChatTimeoutRecord';
import { createTimeoutWakeUpMessage } from './createTimeoutWakeUpMessage';
import { hasPlannedMessageRecurrence, isPlannedMessageScheduleFinished } from './plannedMessageSchedule';
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
    repeatFiredUserChatTimeout,
    updateAgentScopedUserChatTimeout,
} from './userChatTimeoutStore';

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
    readonly durationMs?: number;
    readonly recurrenceIntervalMs?: number | null;
    readonly cronExpression?: string | null;
    readonly startsAt?: string | null;
    readonly endsAt?: string | null;
    readonly maxRunCount?: number | null;
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
        recurrenceIntervalMs: options.recurrenceIntervalMs,
        cronExpression: options.cronExpression,
        startsAt: options.startsAt,
        endsAt: options.endsAt,
        maxRunCount: options.maxRunCount,
        message: options.message,
        parameters: options.parameters,
    });

    console.info('[user-chat-timeout]', 'set', {
        chatId: timeout.chatId,
        timeoutId: timeout.timeoutId,
        dueAt: timeout.dueAt,
        durationMs: timeout.durationMs,
    });

    await recordAgentGoalChatPlannedMessageNote(timeout);
    scheduleUserChatTimeoutLocalWakeup(timeout);

    return timeout;
}

/**
 * Cancels one scheduled timeout and clears any best-effort local wake-up.
 *
 * @private internal utility of userChatTimeout
 */
export async function cancelScheduledUserChatTimeout(timeoutId: string): Promise<UserChatTimeoutRecord | null> {
    // Note: Cancelling an already-cancelled timeout is a no-op, and must not repeat its goal-chat note
    const timeoutBeforeCancellation = await getUserChatTimeoutById(timeoutId);
    const cancelledTimeout = await cancelUserChatTimeout(timeoutId);
    clearUserChatTimeoutLocalWakeup(timeoutId);

    if (cancelledTimeout) {
        console.info('[user-chat-timeout]', 'cancel', {
            chatId: cancelledTimeout.chatId,
            timeoutId: cancelledTimeout.timeoutId,
            status: cancelledTimeout.status,
            cancelRequestedAt: cancelledTimeout.cancelRequestedAt,
        });

        if (!timeoutBeforeCancellation?.cancelRequestedAt) {
            await recordAgentGoalChatCancelledPlannedMessageNote(cancelledTimeout);
        }
    }

    return cancelledTimeout;
}

/**
 * Updates the schedule of one planned message and keeps every wake-up surface in sync.
 *
 * This is the counterpart of scheduling and cancelling: one planned message can be re-planned without
 * losing its identity, so the agent keeps the `timeoutId` it already knows and the goal chat records
 * the new schedule.
 *
 * @param options - Scoped timeout identity together with the schedule patch.
 * @returns The updated timeout, or `null` when there is no such planned message.
 *
 * @private internal utility of userChatTimeout
 */
export async function updateScheduledUserChatTimeout(
    options: UpdateAgentScopedUserChatTimeoutOptions,
): Promise<UserChatTimeoutRecord | null> {
    const updatedTimeout = await updateAgentScopedUserChatTimeout(options);

    if (!updatedTimeout) {
        return null;
    }

    console.info('[user-chat-timeout]', 'update', {
        chatId: updatedTimeout.chatId,
        timeoutId: updatedTimeout.timeoutId,
        dueAt: updatedTimeout.dueAt,
        recurrenceIntervalMs: updatedTimeout.recurrenceIntervalMs,
        cronExpression: updatedTimeout.cronExpression,
    });

    notifyUserChatTimeoutScheduleChanged(updatedTimeout);
    await recordAgentGoalChatPlannedMessageNote(updatedTimeout, createAgentGoalChatUpdatedPlannedMessageNoteContent);

    return updatedTimeout;
}

/**
 * Mirrors one planned message and its schedule into the goal chat of the owning agent.
 *
 * Planned messages can be created from any chat, but the agent's own thread is where all of them
 * become visible, so the goal chat always shows the full plan.
 *
 * @param timeout - Planned message that was just scheduled or re-planned.
 * @param createNoteContent - Note wording of the recorded schedule change.
 *
 * @private internal utility of userChatTimeout
 */
async function recordAgentGoalChatPlannedMessageNote(
    timeout: UserChatTimeoutRecord,
    createNoteContent: (
        options: AgentGoalChatPlannedMessageNoteOptions,
    ) => string = createAgentGoalChatPlannedMessageNoteContent,
): Promise<void> {
    await appendAgentGoalChatNote({
        agentPermanentId: timeout.agentPermanentId,
        content: createNoteContent({
            timeoutId: timeout.timeoutId,
            dueAt: timeout.dueAt,
            intervalMs: timeout.recurrenceIntervalMs,
            cronExpression: timeout.cronExpression,
            startsAt: timeout.startsAt,
            endsAt: timeout.endsAt,
            maxRunCount: timeout.maxRunCount,
            runCount: timeout.runCount,
            message: timeout.message,
        }),
    }).catch((error) => {
        console.error('[user-chat-timeout]', 'goal_chat_planned_note_failed', {
            timeoutId: timeout.timeoutId,
            error: serializeError(error as Error),
        });
    });
}

/**
 * Mirrors one cancelled planned message into the goal chat of the owning agent.
 *
 * @private internal utility of userChatTimeout
 */
async function recordAgentGoalChatCancelledPlannedMessageNote(timeout: UserChatTimeoutRecord): Promise<void> {
    await appendAgentGoalChatNote({
        agentPermanentId: timeout.agentPermanentId,
        content: createAgentGoalChatCancelledPlannedMessageNoteContent({ timeoutId: timeout.timeoutId }),
    }).catch((error) => {
        console.error('[user-chat-timeout]', 'goal_chat_cancelled_note_failed', {
            timeoutId: timeout.timeoutId,
            error: serializeError(error as Error),
        });
    });
}

/**
 * Retained compatibility no-op for call sites that previously started a polling loop.
 *
 * @private internal utility of userChatTimeout
 */
export function ensureUserChatTimeoutWorkerRunning(): void {
    return;
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
 * Refreshes the best-effort local wake-up after one timeout schedule mutation.
 *
 * @private internal utility of userChatTimeout
 */
export function notifyUserChatTimeoutScheduleChanged(timeout: UserChatTimeoutRecord): void {
    if (timeout.status !== 'QUEUED' || timeout.cancelRequestedAt || timeout.pausedAt) {
        clearUserChatTimeoutLocalWakeup(timeout.timeoutId);
        return;
    }

    const dueAtTimestamp = new Date(timeout.dueAt).getTime();
    if (!Number.isFinite(dueAtTimestamp)) {
        clearUserChatTimeoutLocalWakeup(timeout.timeoutId);
        return;
    }

    if (dueAtTimestamp <= Date.now()) {
        clearUserChatTimeoutLocalWakeup(timeout.timeoutId);
        kickUserChatTimeoutWorkerTick();
        return;
    }

    scheduleUserChatTimeoutLocalWakeup(timeout);
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

            await runWithTaskTerminalCapture(claimedTimeout.timeoutId, () =>
                processClaimedUserChatTimeout(claimedTimeout),
            );
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

        if (
            isPlannedMessageScheduleFinished({
                schedule: latestTimeout,
                completedRunCount: latestTimeout.runCount,
                atDate: new Date(),
            })
        ) {
            // Note: A wake-up delayed past the ending date of its plan is dropped instead of fired late
            await markUserChatTimeoutCancelled(
                latestTimeout.timeoutId,
                'Planned message reached the end of its schedule.',
            );
            console.info('[user-chat-timeout]', 'schedule_finished', {
                chatId: latestTimeout.chatId,
                timeoutId: latestTimeout.timeoutId,
                dueAt: latestTimeout.dueAt,
                endsAt: latestTimeout.endsAt,
                runCount: latestTimeout.runCount,
                maxRunCount: latestTimeout.maxRunCount,
            });
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

        const timeoutClientMessageId = createTimeoutClientMessageId(latestTimeout);
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
                        intervalMs: latestTimeout.recurrenceIntervalMs,
                        cronExpression: latestTimeout.cronExpression,
                        startsAt: latestTimeout.startsAt,
                        endsAt: latestTimeout.endsAt,
                        maxRunCount: latestTimeout.maxRunCount,
                        runCount: latestTimeout.runCount + 1,
                        message: latestTimeout.message,
                    }),
                    messageSender: isAgentGoalChatId(latestTimeout.chatId) ? 'AGENT' : 'USER',
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
                origin: await resolveCurrentOrInternalServerOrigin(),
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

        try {
            await finishFiredUserChatTimeout(latestTimeout);
        } catch (repetitionError) {
            const repetitionReason =
                repetitionError instanceof Error ? repetitionError.message : 'Failed to repeat the planned message.';
            await appendUserChatTimeoutWarningMessage(
                latestTimeout,
                `Repeating schedule failed: ${repetitionReason}`,
            ).catch(() => undefined);
            console.error('[user-chat-timeout]', 'repeat_failed', {
                chatId: latestTimeout.chatId,
                timeoutId: latestTimeout.timeoutId,
                error: serializeError(repetitionError as Error),
            });
        }

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
async function appendUserChatTimeoutWarningMessage(
    timeout: UserChatTimeoutRecord,
    failureReason: string,
): Promise<void> {
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
    const updatedChat = await mutateUserChat({
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

    const warningMessage = updatedChat.messages[updatedChat.messages.length - 1];
    if (warningMessage) {
        await sendUserChatPushNotification({
            chat: updatedChat,
            message: warningMessage,
        }).catch((error) => {
            console.error('[push-notification]', 'send_failed_timeout_warning', {
                userId: updatedChat.userId,
                chatId: updatedChat.id,
                messageId: warningMessage.id,
                error,
            });
        });
    }
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
 * Closes one fired timeout, keeping a repeating planned message armed for its next wake-up.
 *
 * A repeating timeout is the durable counterpart of `setInterval`, so it is re-armed in place
 * instead of being completed: it keeps one row, one identity, and one cancellation point. A
 * timeout that does not repeat, one whose schedule is over — because it ran as many times as it was
 * planned to run or its ending date passed — and one that was cancelled while it was firing all
 * become terminal, so a finished plan disappears from everything the agent is shown.
 *
 * @param firedTimeout - Timeout whose wake-up turn was just queued.
 *
 * @private internal utility of userChatTimeout
 */
async function finishFiredUserChatTimeout(firedTimeout: UserChatTimeoutRecord): Promise<void> {
    if (hasPlannedMessageRecurrence(firedTimeout)) {
        const repeatedTimeout = await repeatFiredUserChatTimeout(firedTimeout.timeoutId);

        if (repeatedTimeout?.status === 'QUEUED') {
            console.info('[user-chat-timeout]', 'repeated', {
                chatId: repeatedTimeout.chatId,
                timeoutId: repeatedTimeout.timeoutId,
                dueAt: repeatedTimeout.dueAt,
                recurrenceIntervalMs: repeatedTimeout.recurrenceIntervalMs,
                cronExpression: repeatedTimeout.cronExpression,
                runCount: repeatedTimeout.runCount,
                maxRunCount: repeatedTimeout.maxRunCount,
            });
            scheduleUserChatTimeoutLocalWakeup(repeatedTimeout);
            return;
        }

        // Note: A planned message that could not be re-armed, for example because its schedule is over or
        //       because it was cancelled while it was firing, is closed like a timeout that never repeated
        console.info('[user-chat-timeout]', 'skip_repeat', {
            chatId: firedTimeout.chatId,
            timeoutId: firedTimeout.timeoutId,
            resultingStatus: repeatedTimeout?.status || null,
        });
    }

    const completedTimeout = await markUserChatTimeoutCompleted(firedTimeout.timeoutId);

    if (!completedTimeout || completedTimeout.status !== 'COMPLETED') {
        console.info('[user-chat-timeout]', 'skip_completion_non_completed', {
            chatId: firedTimeout.chatId,
            timeoutId: firedTimeout.timeoutId,
            resultingStatus: completedTimeout?.status || null,
        });
    }
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
 * Builds the synthetic client message id used for one timeout wake-up.
 *
 * A repeating timeout keeps its identity across firings, so the id also carries how many times it
 * already fired: retrying the very same firing stays idempotent, while the next repetition still
 * queues its own wake-up turn.
 *
 * @param timeout - Timeout that is firing.
 * @returns Client message id of this wake-up.
 *
 * @private internal utility of userChatTimeout
 */
function createTimeoutClientMessageId(timeout: Pick<UserChatTimeoutRecord, 'timeoutId' | 'runCount'>): string {
    // Note: The first firing keeps the historical id, so wake-ups queued before repeating support stay deduplicated
    if (timeout.runCount === 0) {
        return `${USER_CHAT_TIMEOUT_CLIENT_MESSAGE_ID_PREFIX}${timeout.timeoutId}`;
    }

    return `${USER_CHAT_TIMEOUT_CLIENT_MESSAGE_ID_PREFIX}${timeout.timeoutId}:${timeout.runCount}`;
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
 * Detects duplicate chat-job enqueue failures so timeout retries stay idempotent.
 *
 * @private internal utility of userChatTimeout
 */
function isDuplicateUserChatJobError(error: unknown): boolean {
    return error instanceof Error && error.name === 'UserChatJobDuplicateError';
}
