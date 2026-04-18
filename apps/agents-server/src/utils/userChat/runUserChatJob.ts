import { logCalendarToolCallsActivity } from '@/src/utils/calendars/logCalendarToolCallsActivity';
import { ensureNonEmptyChatContent } from '@/src/utils/chat/ensureNonEmptyChatContent';
import { appendMessageSuffix, resolveMessageSuffixFromAgentSource } from '@/src/utils/chat/messageSuffix';
import { getUserById } from '@/src/utils/getUserById';
import { resolveAppendOnlySelfLearningAgentSource } from '@/src/utils/resolveAppendOnlySelfLearningAgentSource';
import { prepareToolCallsForStreaming } from '@/src/utils/toolCallStreaming';
import type { ChatMessage, ToolCall } from '@promptbook-local/types';
import { serializeError } from '@promptbook-local/utils';
import type { ChatPromptResult } from '../../../../../src/execution/PromptResult';
import { mergeToolCalls } from '../../../../../src/utils/toolCalls/mergeToolCalls';
import { createRunUserChatJobExecutionContext } from './createRunUserChatJobExecutionContext';
import { createRunUserChatJobPersistenceController } from './createRunUserChatJobPersistenceController';
import { createUserChatJobFailureDetails } from './createUserChatJobFailureDetails';
import {
    createUserChatJobHeartbeatController,
    DEFAULT_USER_CHAT_JOB_HEARTBEAT_INTERVAL_MS,
    DEFAULT_USER_CHAT_JOB_HEARTBEAT_MAX_CONSECUTIVE_FAILURES,
} from './createUserChatJobHeartbeatController';
import { finalizeUserChatJob } from './finalizeUserChatJob';
import { getUserChat } from './getUserChat';
import { heartbeatUserChatJob } from './heartbeatUserChatJob';
import { persistUserChatJobTerminalState } from './persistUserChatJobTerminalState';
import type { UserChatJobRecord } from './UserChatJobRecord';
import { createReplyAwareUserChatPromptContent, createReplyAwareUserChatPromptMessage } from './userChatReplies';
import { resolvePromptThreadBeforeUserMessage } from './userChatMessageLifecycle';
import { isUserChatNotFoundScopeError } from './UserChatScopeError';

/**
 * Error name used when a running durable chat job is cancelled.
 *
 * @private function of `userChat`
 */
const USER_CHAT_JOB_CANCELLED_ERROR_NAME = 'UserChatJobCancelledError';

/**
 * Shared durable-job final reason used when the backing chat disappears mid-run.
 *
 * @private function of `userChat`
 */
const USER_CHAT_JOB_MISSING_CHAT_FAILURE_REASON = 'Chat was deleted before the queued response could be saved.';

/**
 * Terminal outcomes returned from one durable user-chat job execution.
 */
type RunUserChatJobResult = 'completed' | 'failed' | 'cancelled';

/**
 * Base chat/user snapshot needed before the agent runtime can be prepared.
 */
type RunUserChatJobStartContext = {
    currentUserIdentity: {
        userId: number;
        user: {
            username: string;
            isAdmin: boolean;
            profileImageUrl: string | null;
        };
    };
    userMessageAttachments: ChatMessage['attachments'];
    thread: ReturnType<typeof createReplyAwareUserChatPromptMessage>[];
    promptContent: ReturnType<typeof createReplyAwareUserChatPromptContent>;
};

/**
 * Mutable execution flags shared between the heartbeat loop and persistence controller.
 */
type RunUserChatJobExecutionState = {
    isCancellationRequested: boolean;
    hasQueuedCompletedPersistence: boolean;
    hasPersistedCompletedState: boolean;
};

/**
 * Prepared runtime pieces needed to execute the streaming chat call.
 */
type RunUserChatJobExecutionContext = Awaited<ReturnType<typeof createRunUserChatJobExecutionContext>>;

/**
 * Assistant-message persistence controller used while streaming one response.
 */
type RunUserChatJobPersistenceController = ReturnType<typeof createRunUserChatJobPersistenceController>;

/**
 * Runs one claimed durable chat job to completion.
 */
export async function runUserChatJob(job: UserChatJobRecord): Promise<RunUserChatJobResult> {
    const startContext = await resolveRunUserChatJobStartContext(job);
    if (!startContext) {
        return 'cancelled';
    }

    const runState: RunUserChatJobExecutionState = {
        isCancellationRequested: job.cancelRequestedAt !== null,
        hasQueuedCompletedPersistence: false,
        hasPersistedCompletedState: false,
    };
    const abortController = new AbortController();
    const heartbeatController = createRunUserChatJobHeartbeat({
        job,
        runState,
        abortController,
    });

    try {
        const executionContext = await createRunUserChatJobExecutionContext({
            job,
            ...startContext,
        });

        return await executeRunUserChatJob({
            job,
            executionContext,
            runState,
            abortController,
            heartbeatController,
        });
    } finally {
        heartbeatController.stop();
        await heartbeatController.whenIdle().catch(() => undefined);
    }
}

/**
 * Loads and validates the chat/user/message snapshot required before one job can start.
 *
 * @private function of `runUserChatJob`
 */
async function resolveRunUserChatJobStartContext(job: UserChatJobRecord): Promise<RunUserChatJobStartContext | null> {
    const [chat, userRow] = await Promise.all([
        getUserChat({
            userId: job.userId,
            agentPermanentId: job.agentPermanentId,
            chatId: job.chatId,
        }),
        getUserById(job.userId),
    ]);

    if (!chat) {
        await finalizeUserChatJob({
            jobId: job.id,
            status: 'CANCELLED',
            failureReason: USER_CHAT_JOB_MISSING_CHAT_FAILURE_REASON,
        });

        console.info('[user-chat-job] cancelled_missing_chat_before_start', {
            chatId: job.chatId,
            messageId: job.userMessageId,
            jobId: job.id,
        });

        return null;
    }

    if (!userRow) {
        throw new Error(`User "${job.userId}" was not found for durable job "${job.id}".`);
    }

    const userMessage = chat.messages.find((message) => message.id === job.userMessageId);
    if (!userMessage) {
        throw new Error(`User message "${job.userMessageId}" was not found in chat "${job.chatId}".`);
    }

    return {
        currentUserIdentity: {
            userId: userRow.id,
            user: {
                username: userRow.username,
                isAdmin: userRow.isAdmin,
                profileImageUrl: userRow.profileImageUrl,
            },
        },
        userMessageAttachments: userMessage.attachments,
        thread: resolvePromptThreadBeforeUserMessage(chat.messages, job.userMessageId).map(
            createReplyAwareUserChatPromptMessage,
        ),
        promptContent: createReplyAwareUserChatPromptContent(userMessage),
    };
}

/**
 * Starts the lease-renewal loop and wires its cancellation/failure signals into the chat abort controller.
 *
 * @private function of `runUserChatJob`
 */
function createRunUserChatJobHeartbeat(options: {
    job: Pick<UserChatJobRecord, 'id' | 'chatId' | 'userMessageId'>;
    runState: RunUserChatJobExecutionState;
    abortController: AbortController;
}): ReturnType<typeof createUserChatJobHeartbeatController> {
    return createUserChatJobHeartbeatController({
        jobId: options.job.id,
        heartbeat: heartbeatUserChatJob,
        intervalMs: DEFAULT_USER_CHAT_JOB_HEARTBEAT_INTERVAL_MS,
        maxConsecutiveFailures: DEFAULT_USER_CHAT_JOB_HEARTBEAT_MAX_CONSECUTIVE_FAILURES,
        onCancellationRequested: () => {
            if (options.runState.hasQueuedCompletedPersistence || options.runState.hasPersistedCompletedState) {
                return;
            }

            options.runState.isCancellationRequested = true;
            options.abortController.abort(createUserChatJobCancelledError());
        },
        onHeartbeatFailure: async (heartbeatError, consecutiveFailures) => {
            if (options.runState.hasQueuedCompletedPersistence || options.runState.hasPersistedCompletedState) {
                return;
            }

            console.error('[user-chat-job] Heartbeat failed', {
                chatId: options.job.chatId,
                messageId: options.job.userMessageId,
                jobId: options.job.id,
                consecutiveFailures,
                error: serializeError(heartbeatError as Error),
            });
        },
        onFailureLimitReached: (heartbeatError) => {
            if (options.runState.hasQueuedCompletedPersistence || options.runState.hasPersistedCompletedState) {
                return;
            }

            options.abortController.abort(heartbeatError);
        },
    });
}

/**
 * Executes the streaming model call once all runtime prerequisites have been resolved.
 *
 * @private function of `runUserChatJob`
 */
async function executeRunUserChatJob(options: {
    job: UserChatJobRecord;
    executionContext: RunUserChatJobExecutionContext;
    runState: RunUserChatJobExecutionState;
    abortController: AbortController;
    heartbeatController: ReturnType<typeof createUserChatJobHeartbeatController>;
}): Promise<RunUserChatJobResult> {
    const startedAt = Date.now();
    const persistenceController = createRunUserChatJobPersistenceController({
        job: options.job,
        runState: options.runState,
        createPromptSnapshot: options.executionContext.createPromptSnapshot,
        availableTools: options.executionContext.availableTools,
        provider: options.executionContext.provider,
        startedAt,
        stopHeartbeat: () => options.heartbeatController.stop(),
    });

    await persistenceController.persistInitialRunningState();

    console.info('[user-chat-job] start', {
        chatId: options.job.chatId,
        messageId: options.job.userMessageId,
        jobId: options.job.id,
        provider: options.executionContext.provider,
    });

    try {
        const response = await options.executionContext.agent.callChatModelStream!(
            options.executionContext.chatPrompt,
            persistenceController.handleStreamChunk,
            { signal: options.abortController.signal },
        );

        options.heartbeatController.stop();
        await persistenceController.flushAfterStream();
        await options.heartbeatController.whenIdle().catch(() => undefined);

        return await handleSuccessfulRunUserChatJobExecution({
            job: options.job,
            executionContext: options.executionContext,
            persistenceController,
            response,
            startedAt,
        });
    } catch (error) {
        return await handleRunUserChatJobExecutionFailure({
            job: options.job,
            executionContext: options.executionContext,
            persistenceController,
            heartbeatController: options.heartbeatController,
            runState: options.runState,
            error,
            startedAt,
        });
    }
}

/**
 * Persists the final successful chat result and runs any completion follow-up side effects.
 *
 * @private function of `runUserChatJob`
 */
async function handleSuccessfulRunUserChatJobExecution(options: {
    job: UserChatJobRecord;
    executionContext: RunUserChatJobExecutionContext;
    persistenceController: RunUserChatJobPersistenceController;
    response: ChatPromptResult;
    startedAt: number;
}): Promise<'completed'> {
    const normalizedResponse = ensureNonEmptyChatContent({
        content: options.response.content,
        context: `Durable agent chat ${options.executionContext.resolvedAgentName}`,
    });
    const responseContentWithSuffix = appendMessageSuffix(
        normalizedResponse.content,
        resolveMessageSuffixFromAgentSource(options.executionContext.agentSource),
    );
    const latestState = options.persistenceController.getLatestState();
    const finalToolCalls = resolveRunUserChatJobFinalToolCalls(latestState.toolCalls, options.response.toolCalls);
    const generationDurationMs = Date.now() - options.startedAt;

    await options.persistenceController.persistCompletedResponse({
        content: responseContentWithSuffix,
        toolCalls: finalToolCalls,
        rawPromptContent: options.response.rawPromptContent,
        rawRequest: options.response.rawRequest,
        generationDurationMs,
    });

    if (options.response.toolCalls && options.response.toolCalls.length > 0) {
        await logCalendarToolCallsActivity({
            userId: options.job.userId,
            agentPermanentId: options.executionContext.agentPermanentId,
            toolCalls: options.response.toolCalls,
        });
    }

    await persistRunUserChatJobLearnedAgentSource(options.executionContext);

    console.info('[user-chat-job] completed', {
        chatId: options.job.chatId,
        messageId: options.job.userMessageId,
        jobId: options.job.id,
        provider: options.executionContext.provider,
        durationMs: generationDurationMs,
    });

    return 'completed';
}

/**
 * Persists the correct terminal state for any runtime failure that occurs after the chat job starts.
 *
 * @private function of `runUserChatJob`
 */
async function handleRunUserChatJobExecutionFailure(options: {
    job: UserChatJobRecord;
    executionContext: RunUserChatJobExecutionContext;
    persistenceController: RunUserChatJobPersistenceController;
    heartbeatController: ReturnType<typeof createUserChatJobHeartbeatController>;
    runState: RunUserChatJobExecutionState;
    error: unknown;
    startedAt: number;
}): Promise<RunUserChatJobResult> {
    options.heartbeatController.stop();
    await options.persistenceController.settleAfterError();
    await options.heartbeatController.whenIdle().catch(() => undefined);

    if (options.persistenceController.hasPersistedCompletedState()) {
        console.error('[user-chat-job] follow-up failed after completion', {
            chatId: options.job.chatId,
            messageId: options.job.userMessageId,
            jobId: options.job.id,
            provider: options.executionContext.provider,
            error: serializeError(options.error as Error),
        });

        return 'completed';
    }

    const generationDurationMs = Date.now() - options.startedAt;

    if (isUserChatNotFoundScopeError(options.error)) {
        await finalizeUserChatJob({
            jobId: options.job.id,
            status: 'CANCELLED',
            provider: options.executionContext.provider,
            failureReason: USER_CHAT_JOB_MISSING_CHAT_FAILURE_REASON,
        });

        console.info('[user-chat-job] cancelled_missing_chat_during_run', {
            chatId: options.job.chatId,
            messageId: options.job.userMessageId,
            jobId: options.job.id,
            provider: options.executionContext.provider,
            durationMs: generationDurationMs,
        });

        return 'cancelled';
    }

    const failureReason = resolveUserChatJobFailureReason(options.error);
    const failureDetails = createUserChatJobFailureDetails({
        job: options.job,
        summary: failureReason,
        source: 'runUserChatJob',
        provider: options.executionContext.provider,
        generationDurationMs,
        error: options.error,
    });
    const latestState = options.persistenceController.getLatestState();
    const prompt = createRunUserChatJobTerminalPromptSnapshot(
        options.executionContext,
        latestState.toolCalls,
    );

    if (options.runState.isCancellationRequested || isUserChatJobCancelledError(options.error)) {
        await persistUserChatJobTerminalState({
            job: options.job,
            status: 'CANCELLED',
            content: latestState.content,
            toolCalls: latestState.toolCalls,
            prompt,
            availableTools: options.executionContext.availableTools,
            provider: options.executionContext.provider,
            failureReason,
            generationDurationMs,
        });

        console.info('[user-chat-job] cancelled', {
            chatId: options.job.chatId,
            messageId: options.job.userMessageId,
            jobId: options.job.id,
            provider: options.executionContext.provider,
            durationMs: generationDurationMs,
        });

        return 'cancelled';
    }

    await persistUserChatJobTerminalState({
        job: options.job,
        status: 'FAILED',
        content: latestState.content,
        toolCalls: latestState.toolCalls,
        prompt,
        availableTools: options.executionContext.availableTools,
        provider: options.executionContext.provider,
        failureReason,
        failureDetails,
        generationDurationMs,
    });

    console.error('[user-chat-job] failed', {
        chatId: options.job.chatId,
        messageId: options.job.userMessageId,
        jobId: options.job.id,
        provider: options.executionContext.provider,
        durationMs: generationDurationMs,
        error: serializeError(options.error as Error),
    });

    return 'failed';
}

/**
 * Captures the latest prompt snapshot persisted alongside a terminal cancellation or failure state.
 *
 * @private function of `runUserChatJob`
 */
function createRunUserChatJobTerminalPromptSnapshot(
    executionContext: RunUserChatJobExecutionContext,
    toolCalls: ReadonlyArray<ToolCall> | undefined,
) {
    return executionContext.createPromptSnapshot({
        toolCalls,
        completedToolCalls: toolCalls,
    });
}

/**
 * Persists append-only self-learning changes back into the agent collection when applicable.
 *
 * @private function of `runUserChatJob`
 */
async function persistRunUserChatJobLearnedAgentSource(
    executionContext: RunUserChatJobExecutionContext,
): Promise<void> {
    if (executionContext.isBookScopedAgent) {
        return;
    }

    const learnedAgentSource = resolveAppendOnlySelfLearningAgentSource({
        unresolvedAgentSourceBeforeLearning: executionContext.unresolvedAgentSource,
        resolvedAgentSourceBeforeLearning: executionContext.agentSource,
        resolvedAgentSourceAfterLearning: executionContext.agent.agentSource.value,
    });

    if (learnedAgentSource !== null) {
        await executionContext.collection.updateAgentSource(executionContext.agentPermanentId, learnedAgentSource);
    }
}

/**
 * Merges the streamed tool-call snapshot with any final tool calls returned by the model.
 *
 * @private function of `runUserChatJob`
 */
function resolveRunUserChatJobFinalToolCalls(
    latestToolCalls: ReadonlyArray<ToolCall> | undefined,
    responseToolCalls: ReadonlyArray<ToolCall> | undefined,
): ReadonlyArray<ToolCall> | undefined {
    if (!responseToolCalls) {
        return latestToolCalls;
    }

    return mergeToolCalls(latestToolCalls, prepareToolCallsForStreaming(responseToolCalls));
}

/**
 * Builds a normalized cancellation error value.
 *
 * @private function of `userChat`
 */
function createUserChatJobCancelledError(): Error {
    const error = new Error('Chat generation was cancelled.');
    error.name = USER_CHAT_JOB_CANCELLED_ERROR_NAME;
    return error;
}

/**
 * Detects cancellation errors surfaced by the worker.
 *
 * @private function of `userChat`
 */
function isUserChatJobCancelledError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
        return false;
    }

    return (error as { name?: unknown }).name === USER_CHAT_JOB_CANCELLED_ERROR_NAME;
}

/**
 * Resolves the user-facing failure reason stored in canonical chat history.
 *
 * @private function of `userChat`
 */
function resolveUserChatJobFailureReason(error: unknown): string {
    if (isUserChatNotFoundScopeError(error)) {
        return USER_CHAT_JOB_MISSING_CHAT_FAILURE_REASON;
    }

    if (isUserChatJobCancelledError(error)) {
        return 'Chat generation was cancelled.';
    }

    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }

    return 'Chat generation failed.';
}
