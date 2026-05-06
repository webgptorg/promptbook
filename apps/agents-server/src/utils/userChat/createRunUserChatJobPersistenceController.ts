import { prepareToolCallsForStreaming } from '@/src/utils/toolCallStreaming';
import type { ChatMessage, LlmToolDefinition, ToolCall } from '@promptbook-local/types';
import type { ChatPromptResult } from '../../../../../src/execution/PromptResult';
import { mergeToolCalls } from '../../../../../src/utils/toolCalls/mergeToolCalls';
import { extractUsedKnowledgeSourcesFromToolCalls } from './extractUsedKnowledgeSourcesFromToolCalls';
import { persistUserChatJobTerminalState } from './persistUserChatJobTerminalState';
import { updateUserChatAssistantMessage } from './updateUserChatAssistantMessage';
import { USER_CHAT_JOB_ASSISTANT_MESSAGE_PERSIST_INTERVAL_MS } from './userChatJobRuntimeConstants';
import type { UserChatJobRecord } from './UserChatJobRecord';

/**
 * Shared prompt-snapshot factory used while persisting one running durable chat job.
 */
type RunUserChatJobPromptSnapshotFactory = (
    options?: {
        toolCalls?: ReadonlyArray<ToolCall>;
        completedToolCalls?: ReadonlyArray<ToolCall>;
        rawPromptContent?: ChatPromptResult['rawPromptContent'];
        rawRequest?: ChatPromptResult['rawRequest'];
    },
) => NonNullable<ChatMessage['prompt']>;

/**
 * Queues assistant-message updates and terminal completion persistence for one streamed chat turn.
 *
 * @private function of `runUserChatJob`
 */
export function createRunUserChatJobPersistenceController(options: {
    job: Pick<UserChatJobRecord, 'id' | 'userId' | 'agentPermanentId' | 'chatId' | 'assistantMessageId'>;
    runState: {
        hasQueuedCompletedPersistence: boolean;
        hasPersistedCompletedState: boolean;
    };
    createPromptSnapshot: RunUserChatJobPromptSnapshotFactory;
    availableTools: ReadonlyArray<LlmToolDefinition>;
    provider: string | null;
    startedAt: number;
    stopHeartbeat: () => void;
}) {
    let latestContent = '';
    let latestToolCalls: ReadonlyArray<ToolCall> | undefined;
    let persistQueue: Promise<void> = Promise.resolve();
    let lastAssistantMessagePersistedAt = 0;
    let lastPersistedAssistantSnapshotSignature: string | null = null;
    let hasPendingAssistantMessageUpdate = false;
    let assistantMessageUpdateTimeout: ReturnType<typeof setTimeout> | null = null;

    /**
     * Queues one assistant-message mutation behind any earlier persistence work.
     *
     * @private function of `createRunUserChatJobPersistenceController`
     */
    const queueAssistantMessageUpdate = (
        mutateMessage: Parameters<typeof updateUserChatAssistantMessage>[0]['mutateMessage'],
        updateOptions: {
            snapshotSignature?: string;
        } = {},
    ): void => {
        persistQueue = persistQueue.then(async () => {
            await updateUserChatAssistantMessage({
                userId: options.job.userId,
                agentPermanentId: options.job.agentPermanentId,
                chatId: options.job.chatId,
                assistantMessageId: options.job.assistantMessageId,
                mutateMessage,
            });

            if (updateOptions.snapshotSignature) {
                lastPersistedAssistantSnapshotSignature = updateOptions.snapshotSignature;
            }
        });
    };

    /**
     * Cancels any scheduled delayed assistant-message persistence timer.
     *
     * @private function of `createRunUserChatJobPersistenceController`
     */
    const clearScheduledAssistantMessageUpdate = (): void => {
        if (!assistantMessageUpdateTimeout) {
            return;
        }

        clearTimeout(assistantMessageUpdateTimeout);
        assistantMessageUpdateTimeout = null;
    };

    /**
     * Persists the latest assistant-message snapshot with write throttling.
     *
     * @private function of `createRunUserChatJobPersistenceController`
     */
    const scheduleAssistantMessageUpdate = (force = false): void => {
        if (options.runState.hasQueuedCompletedPersistence || options.runState.hasPersistedCompletedState) {
            clearScheduledAssistantMessageUpdate();
            hasPendingAssistantMessageUpdate = false;
            return;
        }

        const now = Date.now();
        const remainingDelayMs =
            USER_CHAT_JOB_ASSISTANT_MESSAGE_PERSIST_INTERVAL_MS - (now - lastAssistantMessagePersistedAt);

        if (!force && remainingDelayMs > 0) {
            hasPendingAssistantMessageUpdate = true;

            if (!assistantMessageUpdateTimeout) {
                assistantMessageUpdateTimeout = setTimeout(() => {
                    assistantMessageUpdateTimeout = null;
                    scheduleAssistantMessageUpdate(true);
                }, remainingDelayMs);

                assistantMessageUpdateTimeout.unref?.();
            }

            return;
        }

        clearScheduledAssistantMessageUpdate();
        hasPendingAssistantMessageUpdate = false;
        lastAssistantMessagePersistedAt = now;
        const snapshotSignature = createAssistantMessageSnapshotSignature(latestContent, latestToolCalls);

        if (snapshotSignature === lastPersistedAssistantSnapshotSignature) {
            return;
        }

        queueAssistantMessageUpdate(
            (message) => ({
                ...message,
                content: latestContent,
                ongoingToolCalls: latestToolCalls,
                usedSources: extractUsedKnowledgeSourcesFromToolCalls(latestToolCalls),
                lifecycleState: 'running',
                lifecycleError: undefined,
                isComplete: false,
                prompt: options.createPromptSnapshot({
                    toolCalls: latestToolCalls,
                }),
            }),
            {
                snapshotSignature,
            },
        );
    };

    /**
     * Persists the durable completion state immediately after the visible output stream ends.
     *
     * @private function of `createRunUserChatJobPersistenceController`
     */
    const queueCompletedPersistence = (): void => {
        if (options.runState.hasQueuedCompletedPersistence) {
            return;
        }

        options.runState.hasQueuedCompletedPersistence = true;
        clearScheduledAssistantMessageUpdate();
        hasPendingAssistantMessageUpdate = false;
        options.stopHeartbeat();
        persistQueue = persistQueue.then(async () => {
            await persistUserChatJobTerminalState({
                job: options.job,
                status: 'COMPLETED',
                content: latestContent,
                toolCalls: latestToolCalls,
                prompt: options.createPromptSnapshot({
                    toolCalls: latestToolCalls,
                    completedToolCalls: latestToolCalls,
                }),
                availableTools: options.availableTools,
                provider: options.provider,
                generationDurationMs: Date.now() - options.startedAt,
            });
            options.runState.hasPersistedCompletedState = true;
        });
    };

    return {
        persistInitialRunningState: async (): Promise<void> => {
            await updateUserChatAssistantMessage({
                userId: options.job.userId,
                agentPermanentId: options.job.agentPermanentId,
                chatId: options.job.chatId,
                assistantMessageId: options.job.assistantMessageId,
                mutateMessage: (message) => ({
                    ...message,
                    lifecycleState: 'running',
                    lifecycleError: undefined,
                    isComplete: false,
                    availableTools: options.availableTools,
                    prompt: options.createPromptSnapshot(),
                }),
            });
        },
        handleStreamChunk: (chunk: ChatPromptResult & { isFinished?: boolean }): void => {
            latestContent = chunk.content ?? latestContent;
            latestToolCalls = chunk.toolCalls
                ? mergeRunUserChatJobStreamToolCalls(latestToolCalls, chunk.toolCalls)
                : latestToolCalls;

            if (chunk.isFinished === true) {
                scheduleAssistantMessageUpdate(true);
                queueCompletedPersistence();
                return;
            }

            scheduleAssistantMessageUpdate();
        },
        flushAfterStream: async (): Promise<void> => {
            if (hasPendingAssistantMessageUpdate) {
                scheduleAssistantMessageUpdate(true);
            } else {
                clearScheduledAssistantMessageUpdate();
            }

            await persistQueue;
        },
        settleAfterError: async (): Promise<void> => {
            clearScheduledAssistantMessageUpdate();
            hasPendingAssistantMessageUpdate = false;
            await persistQueue.catch(() => undefined);
        },
        persistCompletedResponse: async (completedResponse: {
            content: string;
            toolCalls: ReadonlyArray<ToolCall> | undefined;
            rawPromptContent?: ChatPromptResult['rawPromptContent'];
            rawRequest?: ChatPromptResult['rawRequest'];
            generationDurationMs: number;
        }): Promise<void> => {
            if (options.runState.hasQueuedCompletedPersistence) {
                queueAssistantMessageUpdate((message) => ({
                    ...message,
                    content: completedResponse.content,
                    isComplete: true,
                    lifecycleState: 'completed',
                    lifecycleError: undefined,
                    ongoingToolCalls: undefined,
                    toolCalls: completedResponse.toolCalls ?? message.toolCalls,
                    completedToolCalls: completedResponse.toolCalls ?? message.completedToolCalls,
                    usedSources: extractUsedKnowledgeSourcesFromToolCalls(completedResponse.toolCalls ?? message.toolCalls),
                    generationDurationMs: completedResponse.generationDurationMs,
                    prompt: options.createPromptSnapshot({
                        toolCalls: completedResponse.toolCalls,
                        completedToolCalls: completedResponse.toolCalls,
                        rawPromptContent: completedResponse.rawPromptContent,
                        rawRequest: completedResponse.rawRequest,
                    }),
                }));
                await persistQueue;
                return;
            }

            await persistUserChatJobTerminalState({
                job: options.job,
                status: 'COMPLETED',
                content: completedResponse.content,
                toolCalls: completedResponse.toolCalls,
                prompt: options.createPromptSnapshot({
                    toolCalls: completedResponse.toolCalls,
                    completedToolCalls: completedResponse.toolCalls,
                    rawPromptContent: completedResponse.rawPromptContent,
                    rawRequest: completedResponse.rawRequest,
                }),
                availableTools: options.availableTools,
                provider: options.provider,
                generationDurationMs: completedResponse.generationDurationMs,
            });
            options.runState.hasPersistedCompletedState = true;
        },
        getLatestState: () => ({
            content: latestContent,
            toolCalls: latestToolCalls,
        }),
        hasPersistedCompletedState: (): boolean => options.runState.hasPersistedCompletedState,
    };
}

/**
 * Builds a stable signature for one persisted running-assistant snapshot.
 *
 * @private function of `createRunUserChatJobPersistenceController`
 */
function createAssistantMessageSnapshotSignature(
    content: string,
    toolCalls: ReadonlyArray<ToolCall> | undefined,
): string {
    return JSON.stringify({
        content,
        toolCalls: toolCalls || [],
    });
}

/**
 * Merges streamed tool-call deltas into the latest persisted tool-call snapshot.
 *
 * @private function of `createRunUserChatJobPersistenceController`
 */
function mergeRunUserChatJobStreamToolCalls(
    currentToolCalls: ReadonlyArray<ToolCall> | undefined,
    nextToolCalls: ReadonlyArray<ToolCall>,
): ReadonlyArray<ToolCall> {
    return mergeToolCalls(currentToolCalls, prepareToolCallsForStreaming(nextToolCalls));
}
