import { serializeError, spaceTrim } from '@promptbook-local/utils';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import { resolveCurrentOrInternalServerOrigin } from '../resolveCurrentOrInternalServerOrigin';
import { appendQueuedUserChatTurn } from '../userChat/appendQueuedUserChatTurn';
import { getUserChatJobByClientMessageId } from '../userChat/getUserChatJobByClientMessageId';
import { triggerUserChatJobWorker } from '../userChat/triggerUserChatJobWorker';
import type { UserChatJobRecord } from '../userChat/UserChatJobRecord';
import { ensureAgentGoalChat } from './ensureAgentGoalChat';

/**
 * Prefix used for deterministic lifecycle-triggered goal-chat job ids.
 */
const AGENT_GOAL_CHAT_LIFECYCLE_CLIENT_MESSAGE_ID_PREFIX = 'goal-lifecycle:';

/**
 * Lifecycle context persisted with an autonomous goal-chat turn.
 */
export type AgentGoalChatTurnTrigger = 'CREATED' | 'MODIFIED';

/**
 * Input needed to enqueue one agent-owned goal-chat turn.
 */
export type EnqueueAgentGoalChatTurnOptions = {
    readonly agentPermanentId: string;
    readonly content: string;
    readonly sourceFingerprint: string;
    readonly trigger: AgentGoalChatTurnTrigger;
};

/**
 * Dependencies used to persist and trigger an autonomous goal-chat turn.
 */
type AgentGoalChatTurnEnqueuerDependencies = {
    readonly ensureAgentGoalChat: typeof ensureAgentGoalChat;
    readonly appendQueuedUserChatTurn: typeof appendQueuedUserChatTurn;
    readonly getUserChatJobByClientMessageId: typeof getUserChatJobByClientMessageId;
    readonly resolveCurrentOrInternalServerOrigin: typeof resolveCurrentOrInternalServerOrigin;
    readonly triggerUserChatJobWorker: typeof triggerUserChatJobWorker;
};

/**
 * Production dependencies for autonomous goal-chat turns.
 */
const AGENT_GOAL_CHAT_TURN_ENQUEUER_DEPENDENCIES: AgentGoalChatTurnEnqueuerDependencies = {
    ensureAgentGoalChat,
    appendQueuedUserChatTurn,
    getUserChatJobByClientMessageId,
    resolveCurrentOrInternalServerOrigin,
    triggerUserChatJobWorker,
};

/**
 * Creates an idempotent enqueuer for server-triggered turns in an agent's singleton goal chat.
 *
 * @param dependencyOverrides - Optional dependency substitutions used by focused tests.
 * @returns Function that resolves the singleton chat, appends a durable turn, and wakes its worker.
 */
export function createAgentGoalChatTurnEnqueuer(
    dependencyOverrides: Partial<AgentGoalChatTurnEnqueuerDependencies> = {},
): (options: EnqueueAgentGoalChatTurnOptions) => Promise<UserChatJobRecord> {
    const dependencies: AgentGoalChatTurnEnqueuerDependencies = {
        ...AGENT_GOAL_CHAT_TURN_ENQUEUER_DEPENDENCIES,
        ...dependencyOverrides,
    };

    return async (options: EnqueueAgentGoalChatTurnOptions): Promise<UserChatJobRecord> => {
        const goalChat = await dependencies.ensureAgentGoalChat(options.agentPermanentId);
        const clientMessageId = createAgentGoalChatLifecycleClientMessageId(options.sourceFingerprint);
        const existingJob = await dependencies.getUserChatJobByClientMessageId({
            userId: goalChat.userId,
            agentPermanentId: options.agentPermanentId,
            chatId: goalChat.id,
            clientMessageId,
        });

        if (existingJob) {
            return existingJob;
        }

        let job: UserChatJobRecord;

        try {
            const queuedTurn = await dependencies.appendQueuedUserChatTurn({
                userId: goalChat.userId,
                agentPermanentId: options.agentPermanentId,
                chatId: goalChat.id,
                clientMessageId,
                messageContent: options.content,
                messageSender: 'AGENT',
                parameters: {
                    agentGoalChatTrigger: options.trigger,
                    agentGoalChatSourceFingerprint: options.sourceFingerprint,
                },
            });
            job = queuedTurn.job;
        } catch (error) {
            if (!isDuplicateUserChatJobError(error)) {
                throw error;
            }

            const racedJob = await dependencies.getUserChatJobByClientMessageId({
                userId: goalChat.userId,
                agentPermanentId: options.agentPermanentId,
                chatId: goalChat.id,
                clientMessageId,
            });

            if (!racedJob) {
                throw new DatabaseError(
                    spaceTrim(`
                        Goal-chat turn \`${clientMessageId}\` was reported as duplicated but could not be loaded.

                        - Agent: \`${options.agentPermanentId}\`
                        - Goal chat: \`${goalChat.id}\`
                    `),
                );
            }

            job = racedJob;
        }

        try {
            await dependencies.triggerUserChatJobWorker({
                origin: await dependencies.resolveCurrentOrInternalServerOrigin(),
                preferredJobId: job.id,
            });
        } catch (error) {
            // Note: The durable job remains queued and will be picked up by the regular worker tick
            console.error('[agent-goal-chat]', 'turn_trigger_failed', {
                agentPermanentId: options.agentPermanentId,
                chatId: goalChat.id,
                jobId: job.id,
                error: serializeError(error as Error),
            });
        }

        return job;
    };
}

/**
 * Production enqueuer for lifecycle-triggered goal-chat turns.
 */
export const enqueueAgentGoalChatTurn = createAgentGoalChatTurnEnqueuer();

/**
 * Creates a stable client message id for one source version.
 *
 * The trigger reason is deliberately excluded: creating an agent and immediately saving the same
 * source must not run the same goal review twice.
 *
 * @param sourceFingerprint - Hash of the agent source that caused the turn.
 * @returns Durable job idempotency key.
 */
export function createAgentGoalChatLifecycleClientMessageId(sourceFingerprint: string): string {
    return `${AGENT_GOAL_CHAT_LIFECYCLE_CLIENT_MESSAGE_ID_PREFIX}${sourceFingerprint}`;
}

/**
 * Detects the durable-job unique-constraint error used for idempotent enqueue recovery.
 *
 * @param error - Caught append failure.
 * @returns `true` when another request already created the same job.
 */
function isDuplicateUserChatJobError(error: unknown): boolean {
    return error instanceof Error && error.name === 'UserChatJobDuplicateError';
}
