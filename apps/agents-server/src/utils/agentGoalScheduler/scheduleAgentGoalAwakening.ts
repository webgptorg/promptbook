import type { string_agent_permanent_id, string_book } from '@promptbook-local/types';
import { serializeError, spaceTrim } from '@promptbook-local/utils';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import { findAgentByIdentifier } from '../agentOwnership';
import { resolveCurrentOrInternalServerOrigin } from '../resolveCurrentOrInternalServerOrigin';
import { appendQueuedUserChatTurn } from '../userChat/appendQueuedUserChatTurn';
import { createUserChat } from '../userChat/createUserChat';
import { getUserChat } from '../userChat/getUserChat';
import { getUserChatJobByClientMessageId } from '../userChat/getUserChatJobByClientMessageId';
import { mutateUserChat } from '../userChat/mutateUserChat';
import { triggerUserChatJobWorker } from '../userChat/triggerUserChatJobWorker';
import type { UserChatJobRecord } from '../userChat/UserChatJobRecord';
import type { UserChatRecord } from '../userChat/UserChatRecord';
import { USER_CHAT_SOURCES } from '../userChat/UserChatSource';
import {
    cancelAllActiveAgentScopedUserChatTimeouts,
    cancelScheduledUserChatTimeout,
    listUserChatTimeouts,
} from '../userChatTimeout';
import {
    AGENT_GOAL_CHAT_TITLE,
    createAgentGoalAwakeningClientMessageId,
    createAgentGoalAwakeningMessage,
    createAgentGoalChatId,
    createAgentGoalSourceHash,
    hasExplicitUseTimeoutCommitment,
    resolveEffectiveGoalFromAgentSource,
    type AgentGoalAwakeningTriggerReason,
} from './agentGoalSchedulingSource';

/**
 * Prompt parameter flag identifying a durable turn as a goal scheduler wake-up.
 *
 * @private internal constant of agentGoalScheduler
 */
const AGENT_GOAL_WAKE_UP_PARAMETER_FLAG = 'agentGoalWakeUp';

/**
 * Prompt parameter key storing the reason that enqueued the goal wake-up.
 *
 * @private internal constant of agentGoalScheduler
 */
const AGENT_GOAL_TRIGGER_REASON_PARAMETER = 'agentGoalTriggerReason';

/**
 * Prompt parameter key storing the source fingerprint that enqueued the goal wake-up.
 *
 * @private internal constant of agentGoalScheduler
 */
const AGENT_GOAL_SOURCE_HASH_PARAMETER = 'agentGoalSourceHash';

/**
 * Input accepted when scheduling an autonomous goal review turn.
 */
export type ScheduleAgentGoalAwakeningOptions = {
    /**
     * Stable agent id.
     */
    agentPermanentId: string_agent_permanent_id;

    /**
     * Current agent book source.
     */
    agentSource: string_book;

    /**
     * Lifecycle event that should wake the agent.
     */
    triggerReason: AgentGoalAwakeningTriggerReason;

    /**
     * Known owner id; when omitted it is resolved from the agent row.
     */
    userId?: number;

    /**
     * Optional origin used to trigger the durable chat worker.
     */
    origin?: string;
};

/**
 * Result of one autonomous goal scheduling attempt.
 */
export type ScheduleAgentGoalAwakeningResult =
    | {
          status: 'enqueued';
          chatId: string;
          jobId: string;
          agentSourceHash: string;
          goal: string;
      }
    | {
          status: 'already_queued';
          chatId: string;
          jobId: string;
          agentSourceHash: string;
          goal: string;
      }
    | {
          status: 'skipped_missing_owner';
          goal: string | null;
      }
    | {
          status: 'skipped_no_goal';
          chatId: string;
          cancelledTimeoutCount: number;
      };

/**
 * Enqueues one goal-owned chat turn so an agent can inspect and maintain its autonomous schedule.
 *
 * @param options - Agent source and trigger context.
 * @returns Scheduling result.
 */
export async function scheduleAgentGoalAwakening(
    options: ScheduleAgentGoalAwakeningOptions,
): Promise<ScheduleAgentGoalAwakeningResult> {
    const goal = resolveEffectiveGoalFromAgentSource(options.agentSource);
    const userId = await resolveAgentGoalOwnerId({
        agentPermanentId: options.agentPermanentId,
        userId: options.userId,
    });

    if (userId === null) {
        return {
            status: 'skipped_missing_owner',
            goal,
        };
    }

    const chatId = createAgentGoalChatId({
        userId,
        agentPermanentId: options.agentPermanentId,
    });

    if (!goal) {
        const isExplicitUseTimeoutEnabled = hasExplicitUseTimeoutCommitment(options.agentSource);
        const cancelledTimeoutCount = isExplicitUseTimeoutEnabled
            ? await cancelActiveAgentGoalChatTimeouts({
                  userId,
                  agentPermanentId: options.agentPermanentId,
                  chatId,
              })
            : await cancelActiveAgentScopedTimeouts({
                  userId,
                  agentPermanentId: options.agentPermanentId,
              });

        return {
            status: 'skipped_no_goal',
            chatId,
            cancelledTimeoutCount,
        };
    }

    await ensureAgentGoalChat({
        userId,
        agentPermanentId: options.agentPermanentId,
        chatId,
    });

    const agentSourceHash = createAgentGoalSourceHash(options.agentSource);
    const clientMessageId = createAgentGoalAwakeningClientMessageId({
        triggerReason: options.triggerReason,
        agentSourceHash,
    });
    const existingJob = await getGoalAwakeningJob({
        userId,
        agentPermanentId: options.agentPermanentId,
        chatId,
        clientMessageId,
    });

    if (existingJob) {
        return {
            status: 'already_queued',
            chatId,
            jobId: existingJob.id,
            agentSourceHash,
            goal,
        };
    }

    const enqueuedJob = await enqueueAgentGoalAwakeningTurn({
        userId,
        agentPermanentId: options.agentPermanentId,
        chatId,
        clientMessageId,
        goal,
        triggerReason: options.triggerReason,
        agentSourceHash,
    });

    await triggerAgentGoalAwakeningWorker({
        origin: options.origin,
        preferredJobId: enqueuedJob.id,
    });

    return {
        status: 'enqueued',
        chatId,
        jobId: enqueuedJob.id,
        agentSourceHash,
        goal,
    };
}

/**
 * Resolves the user that owns the agent.
 *
 * @private internal utility of agentGoalScheduler
 */
async function resolveAgentGoalOwnerId(options: {
    agentPermanentId: string_agent_permanent_id;
    userId?: number;
}): Promise<number | null> {
    if (typeof options.userId === 'number') {
        return options.userId;
    }

    const agent = await findAgentByIdentifier(options.agentPermanentId);

    return agent?.userId ?? null;
}

/**
 * Ensures the stable goal-owned chat exists and has the expected title.
 *
 * @private internal utility of agentGoalScheduler
 */
async function ensureAgentGoalChat(options: {
    userId: number;
    agentPermanentId: string_agent_permanent_id;
    chatId: string;
}): Promise<UserChatRecord> {
    const existingChat = await getUserChat({
        userId: options.userId,
        agentPermanentId: options.agentPermanentId,
        chatId: options.chatId,
    });

    if (existingChat) {
        return existingChat;
    }

    try {
        await createUserChat({
            userId: options.userId,
            agentPermanentId: options.agentPermanentId,
            chatId: options.chatId,
            source: USER_CHAT_SOURCES.WEB_UI,
            messages: [],
        });

        return await mutateUserChat({
            userId: options.userId,
            agentPermanentId: options.agentPermanentId,
            chatId: options.chatId,
            mutate: () => ({
                title: AGENT_GOAL_CHAT_TITLE,
            }),
        });
    } catch (error) {
        const chatCreatedByConcurrentRequest = await getUserChat({
            userId: options.userId,
            agentPermanentId: options.agentPermanentId,
            chatId: options.chatId,
        });

        if (chatCreatedByConcurrentRequest) {
            return chatCreatedByConcurrentRequest;
        }

        throw error;
    }
}

/**
 * Best-effort wrapper for lifecycle hooks that should not fail agent persistence.
 *
 * @param options - Agent source and trigger context.
 * @returns Scheduling result, or `null` when scheduling failed.
 */
export async function scheduleAgentGoalAwakeningSafely(
    options: ScheduleAgentGoalAwakeningOptions,
): Promise<ScheduleAgentGoalAwakeningResult | null> {
    try {
        return await scheduleAgentGoalAwakening(options);
    } catch (error) {
        console.error('[agent-goal-scheduler]', 'schedule_failed', {
            agentPermanentId: options.agentPermanentId,
            triggerReason: options.triggerReason,
            error: serializeError(error as Error),
        });

        return null;
    }
}

/**
 * Loads an existing deduplicated goal wake-up job.
 *
 * @private internal utility of agentGoalScheduler
 */
async function getGoalAwakeningJob(options: {
    userId: number;
    agentPermanentId: string_agent_permanent_id;
    chatId: string;
    clientMessageId: string;
}): Promise<UserChatJobRecord | null> {
    return await getUserChatJobByClientMessageId({
        userId: options.userId,
        agentPermanentId: options.agentPermanentId,
        chatId: options.chatId,
        clientMessageId: options.clientMessageId,
    });
}

/**
 * Appends one user-like goal wake-up turn and returns its durable chat job.
 *
 * @private internal utility of agentGoalScheduler
 */
async function enqueueAgentGoalAwakeningTurn(options: {
    userId: number;
    agentPermanentId: string_agent_permanent_id;
    chatId: string;
    clientMessageId: string;
    goal: string;
    triggerReason: AgentGoalAwakeningTriggerReason;
    agentSourceHash: string;
}): Promise<UserChatJobRecord> {
    try {
        const enqueuedTurn = await appendQueuedUserChatTurn({
            userId: options.userId,
            agentPermanentId: options.agentPermanentId,
            chatId: options.chatId,
            clientMessageId: options.clientMessageId,
            messageContent: createAgentGoalAwakeningMessage({
                goal: options.goal,
                triggerReason: options.triggerReason,
                agentSourceHash: options.agentSourceHash,
            }),
            parameters: {
                [AGENT_GOAL_WAKE_UP_PARAMETER_FLAG]: 'true',
                [AGENT_GOAL_TRIGGER_REASON_PARAMETER]: options.triggerReason,
                [AGENT_GOAL_SOURCE_HASH_PARAMETER]: options.agentSourceHash,
            },
        });

        return enqueuedTurn.job;
    } catch (error) {
        if (!isDuplicateUserChatJobError(error)) {
            throw error;
        }

        const existingJob = await getGoalAwakeningJob({
            userId: options.userId,
            agentPermanentId: options.agentPermanentId,
            chatId: options.chatId,
            clientMessageId: options.clientMessageId,
        });

        if (existingJob) {
            return existingJob;
        }

        throw new DatabaseError(
            spaceTrim(`
                Goal wake-up job was reported as duplicated but could not be loaded.

                - Chat: \`${options.chatId}\`
                - Client message id: \`${options.clientMessageId}\`
            `),
        );
    }
}

/**
 * Triggers the durable chat worker after the goal wake-up job is queued.
 *
 * @private internal utility of agentGoalScheduler
 */
async function triggerAgentGoalAwakeningWorker(options: { origin?: string; preferredJobId: string }): Promise<void> {
    try {
        await triggerUserChatJobWorker({
            origin: options.origin ?? (await resolveCurrentOrInternalServerOrigin()),
            preferredJobId: options.preferredJobId,
        });
    } catch (error) {
        console.error('[agent-goal-scheduler]', 'trigger_failed', {
            jobId: options.preferredJobId,
            error: serializeError(error as Error),
        });
    }
}

/**
 * Cancels active timeouts owned by the goal chat after explicit `USE TIMEOUT` remains enabled.
 *
 * @private internal utility of agentGoalScheduler
 */
async function cancelActiveAgentGoalChatTimeouts(options: {
    userId: number;
    agentPermanentId: string_agent_permanent_id;
    chatId: string;
}): Promise<number> {
    const activeTimeouts = await listUserChatTimeouts({
        userId: options.userId,
        agentPermanentId: options.agentPermanentId,
        chatId: options.chatId,
        onlyActive: true,
    });
    let cancelledTimeoutCount = 0;

    for (const timeout of activeTimeouts) {
        const cancelledTimeout = await cancelScheduledUserChatTimeout(timeout.timeoutId);

        if (cancelledTimeout) {
            cancelledTimeoutCount++;
        }
    }

    return cancelledTimeoutCount;
}

/**
 * Cancels all active timeouts for one agent after GOAL-driven scheduling was removed.
 *
 * @private internal utility of agentGoalScheduler
 */
async function cancelActiveAgentScopedTimeouts(options: {
    userId: number;
    agentPermanentId: string_agent_permanent_id;
}): Promise<number> {
    const bulkCancellationSummary = await cancelAllActiveAgentScopedUserChatTimeouts({
        userId: options.userId,
        agentPermanentId: options.agentPermanentId,
    });

    return bulkCancellationSummary.updatedCount;
}

/**
 * Detects duplicate chat-job enqueue failures.
 *
 * @private internal utility of agentGoalScheduler
 */
function isDuplicateUserChatJobError(error: unknown): boolean {
    return error instanceof Error && error.name === 'UserChatJobDuplicateError';
}
