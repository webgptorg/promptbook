import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideOpenAiAgentKitExecutionToolsForServer } from '@/src/tools/$provideOpenAiAgentKitExecutionToolsForServer';
import { createAgentProgressTools } from '@/src/tools/createAgentProgressTools';
import { createChatAttachmentTools } from '@/src/tools/createChatAttachmentTools';
import {
    AGENT_PREPARATION_CHAT_WAIT_TIMEOUT_MS,
    resolveAgentCollectionTablePrefix,
    waitForRunningAgentPreparation,
} from '@/src/utils/agentPreparation';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import { AgentKitCacheManager } from '@/src/utils/cache/AgentKitCacheManager';
import {
    resolveCachedServerAgentContext,
    resolveCachedServerAgentModelRequirements,
} from '@/src/utils/cachedServerAgentRuntime';
import { extractUseCalendarConnectionsFromAgentSource } from '@/src/utils/calendars/extractUseCalendarConnectionsFromAgentSource';
import { logCalendarToolCallsActivity } from '@/src/utils/calendars/logCalendarToolCallsActivity';
import { ensureNonEmptyChatContent } from '@/src/utils/chat/ensureNonEmptyChatContent';
import { appendMessageSuffix, resolveMessageSuffixFromAgentSource } from '@/src/utils/chat/messageSuffix';
import { extractUseEmailConfigurationFromAgentSource } from '@/src/utils/emails/extractUseEmailConfigurationFromAgentSource';
import { getTeacherRemoteAgent } from '@/src/utils/getTeacherRemoteAgent';
import { getUserById } from '@/src/utils/getUserById';
import { composePromptParametersWithMemoryContext } from '@/src/utils/memoryRuntimeContext';
import { extractProjectRepositoriesFromAgentSource } from '@/src/utils/projects/extractProjectRepositoriesFromAgentSource';
import { resolveCurrentOrInternalServerOrigin } from '@/src/utils/resolveCurrentOrInternalServerOrigin';
import { resolveUseCalendarGoogleToken } from '@/src/utils/resolveUseCalendarGoogleToken';
import { resolveUseEmailSmtpCredential } from '@/src/utils/resolveUseEmailSmtpCredential';
import { resolveUseProjectGithubToken } from '@/src/utils/resolveUseProjectGithubToken';
import { resolveAppendOnlySelfLearningAgentSource } from '@/src/utils/resolveAppendOnlySelfLearningAgentSource';
import { prepareToolCallsForStreaming } from '@/src/utils/toolCallStreaming';
import { Agent, computeAgentHash } from '@promptbook-local/core';
import type { LlmToolDefinition, ToolCall } from '@promptbook-local/types';
import { serializeError } from '@promptbook-local/utils';
import type { ChatPromptResult } from '../../../../../src/execution/PromptResult';
import { mergeToolCalls } from '../../../../../src/utils/toolCalls/mergeToolCalls';
import { finalizeUserChatJob } from './finalizeUserChatJob';
import { getUserChat } from './getUserChat';
import { heartbeatUserChatJob } from './heartbeatUserChatJob';
import { persistUserChatJobTerminalState } from './persistUserChatJobTerminalState';
import { updateUserChatAssistantMessage } from './updateUserChatAssistantMessage';
import type { UserChatJobRecord } from './UserChatJobRecord';
import { resolvePromptThreadBeforeUserMessage } from './userChatMessageLifecycle';
import { isUserChatNotFoundScopeError } from './UserChatScopeError';

/**
 * Heartbeat cadence used while one chat job is actively streaming.
 *
 * @private function of `userChat`
 */
const USER_CHAT_JOB_HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Minimum interval between persisted assistant-message snapshots while streaming.
 *
 * Throttling this write path avoids overwhelming Supabase with token-level updates.
 *
 * @private function of `userChat`
 */
const USER_CHAT_JOB_ASSISTANT_MESSAGE_PERSIST_INTERVAL_MS = 5_000;

/**
 * Maximum number of consecutive heartbeat failures tolerated before aborting one running job.
 *
 * @private function of `userChat`
 */
const USER_CHAT_JOB_HEARTBEAT_MAX_CONSECUTIVE_FAILURES = 3;

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
 * Runs one claimed durable chat job to completion.
 */
export async function runUserChatJob(job: UserChatJobRecord): Promise<'completed' | 'failed' | 'cancelled'> {
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

        return 'cancelled';
    }

    if (!userRow) {
        throw new Error(`User "${job.userId}" was not found for durable job "${job.id}".`);
    }

    const userMessage = chat.messages.find((message) => message.id === job.userMessageId);
    if (!userMessage) {
        throw new Error(`User message "${job.userMessageId}" was not found in chat "${job.chatId}".`);
    }

    const thread = resolvePromptThreadBeforeUserMessage(chat.messages, job.userMessageId);
    const [localServerUrl, collection, baseAgentReferenceResolver] = await Promise.all([
        resolveCurrentOrInternalServerOrigin(),
        $provideAgentCollectionForServer(),
        $provideAgentReferenceResolver(),
    ]);
    const resolvedAgentContext = await resolveCachedServerAgentContext({
        collection,
        agentIdentifier: job.agentPermanentId,
        localServerUrl,
        fallbackResolver: baseAgentReferenceResolver,
    });
    const preparedAgentModelRequirements = await resolveCachedServerAgentModelRequirements({
        resolvedAgentContext,
        localServerUrl,
        fallbackResolver: baseAgentReferenceResolver,
    });
    const agentSource = resolvedAgentContext.resolvedAgentSource;
    const unresolvedAgentSource = resolvedAgentContext.unresolvedAgentSource;
    const agentPermanentId = resolvedAgentContext.parentAgentPermanentId;
    const resolvedAgentName = resolvedAgentContext.resolvedAgentName;
    const projectRepositories = extractProjectRepositoriesFromAgentSource(agentSource);
    const calendarConnections = extractUseCalendarConnectionsFromAgentSource(agentSource);
    const useEmailConfiguration = extractUseEmailConfigurationFromAgentSource(agentSource);
    const [projectGithubToken, calendarGoogleAccessToken, emailSmtpCredential] = await Promise.all([
        resolveUseProjectGithubToken({
            userId: job.userId,
            agentPermanentId,
        }),
        calendarConnections.length > 0
            ? resolveUseCalendarGoogleToken({
                  userId: job.userId,
                  agentPermanentId,
              })
            : Promise.resolve(undefined),
        useEmailConfiguration.isEnabled
            ? resolveUseEmailSmtpCredential({
                  userId: job.userId,
                  agentPermanentId,
              })
            : Promise.resolve(undefined),
    ]);
    const runtimeTools = createAgentProgressTools(createChatAttachmentTools([], userMessage.attachments || []));

    /**
     * Full list of tools that were available to the model for this chat turn.
     *
     * Combines agent-commitment tools (e.g. browser, calendar, team) with runtime tools
     * (attachment handlers, progress markers) to match exactly what the LLM sees.
     * Captured here from the exact objects used to construct the model request so the
     * message inspector can show accurate tool availability per turn.
     */
    const availableTools: ReadonlyArray<LlmToolDefinition> = [
        ...(preparedAgentModelRequirements.modelRequirements.tools ?? []),
        ...runtimeTools,
    ];
    const promptParameters = composePromptParametersWithMemoryContext({
        baseParameters: job.parameters,
        currentUserIdentity: {
            userId: userRow.id,
            user: {
                username: userRow.username,
                isAdmin: userRow.isAdmin,
                profileImageUrl: userRow.profileImageUrl,
            },
        },
        agentPermanentId,
        agentName: resolvedAgentName,
        chatId: job.chatId,
        assistantMessageId: job.assistantMessageId,
        isPrivateModeEnabled: false,
        projectRepositories,
        projectGithubToken,
        emailSmtpCredential,
        emailFromAddress: useEmailConfiguration.senderEmail,
        calendarGoogleAccessToken,
        calendarConnections,
        chatAttachments: userMessage.attachments,
    });
    const agentKitCacheManager = new AgentKitCacheManager({ isVerbose: true });
    const baseOpenAiToolsPromise = $provideOpenAiAgentKitExecutionToolsForServer();
    const agentHash = computeAgentHash(agentSource);
    const tablePrefix = resolveAgentCollectionTablePrefix(collection);
    const preparationWaitResult = await waitForRunningAgentPreparation({
        tablePrefix,
        agentPermanentId,
        fingerprint: agentHash,
        timeoutMs: AGENT_PREPARATION_CHAT_WAIT_TIMEOUT_MS,
    });

    if (preparationWaitResult !== 'not_running') {
        console.info('[user-chat-job]', 'preparation_wait', {
            chatId: job.chatId,
            messageId: job.userMessageId,
            agentPermanentId,
            preparationWaitResult,
        });
    }

    const agentKitResult = await agentKitCacheManager.getOrCreateAgentKitAgent(
        agentSource,
        resolvedAgentName,
        await baseOpenAiToolsPromise,
        {
            includeDynamicContext: true,
            agentId: agentPermanentId,
            modelRequirements: preparedAgentModelRequirements.modelRequirements,
        },
    );
    const provider: string | null = agentKitResult.tools.title;
    const agent = new Agent({
        isVerbose: true,
        assistantPreparationMode: 'external',
        executionTools: {
            llm: agentKitResult.tools,
        },
        agentSource,
        teacherAgent: await getTeacherRemoteAgent(),
    });
    const startedAt = Date.now();
    let latestContent = '';
    let latestToolCalls: ReadonlyArray<ToolCall> | undefined;
    let isCancellationRequested = job.cancelRequestedAt !== null;
    let persistQueue: Promise<void> = Promise.resolve();
    let hasQueuedCompletedPersistence = false;
    let hasPersistedCompletedState = false;
    let lastAssistantMessagePersistedAt = 0;
    let lastPersistedAssistantSnapshotSignature: string | null = null;
    let consecutiveHeartbeatFailures = 0;
    let hasPendingAssistantMessageUpdate = false;
    let assistantMessageUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
    const abortController = new AbortController();
    const heartbeatTimer = setInterval(() => {
        persistQueue = persistQueue
            .then(async () => {
                const nextJob = await heartbeatUserChatJob(job.id);
                consecutiveHeartbeatFailures = 0;
                if (!nextJob) {
                    isCancellationRequested = true;
                    abortController.abort(createUserChatJobCancelledError());
                    return;
                }

                if (nextJob.cancelRequestedAt) {
                    isCancellationRequested = true;
                    abortController.abort(createUserChatJobCancelledError());
                }
            })
            .catch((heartbeatError) => {
                consecutiveHeartbeatFailures += 1;
                console.error('[user-chat-job] Heartbeat failed', {
                    chatId: job.chatId,
                    messageId: job.userMessageId,
                    jobId: job.id,
                    consecutiveFailures: consecutiveHeartbeatFailures,
                    error: serializeError(heartbeatError as Error),
                });

                if (consecutiveHeartbeatFailures >= USER_CHAT_JOB_HEARTBEAT_MAX_CONSECUTIVE_FAILURES) {
                    abortController.abort(heartbeatError);
                }
            });
    }, USER_CHAT_JOB_HEARTBEAT_INTERVAL_MS);

    heartbeatTimer.unref?.();

    await updateUserChatAssistantMessage({
        userId: job.userId,
        agentPermanentId: job.agentPermanentId,
        chatId: job.chatId,
        assistantMessageId: job.assistantMessageId,
        mutateMessage: (message) => ({
            ...message,
            lifecycleState: 'running',
            lifecycleError: undefined,
            isComplete: false,
            availableTools,
        }),
    });

    console.info('[user-chat-job] start', {
        chatId: job.chatId,
        messageId: job.userMessageId,
        jobId: job.id,
        provider,
    });

    /**
     * Queues one assistant-message mutation behind any earlier persistence work.
     *
     * @private function of `runUserChatJob`
     */
    const queueAssistantMessageUpdate = (
        mutateMessage: Parameters<typeof updateUserChatAssistantMessage>[0]['mutateMessage'],
        options: {
            snapshotSignature?: string;
        } = {},
    ) => {
        persistQueue = persistQueue.then(async () => {
            await updateUserChatAssistantMessage({
                userId: job.userId,
                agentPermanentId: job.agentPermanentId,
                chatId: job.chatId,
                assistantMessageId: job.assistantMessageId,
                mutateMessage,
            });

            if (options.snapshotSignature) {
                lastPersistedAssistantSnapshotSignature = options.snapshotSignature;
            }
        });
    };

    /**
     * Cancels any scheduled delayed assistant-message persistence timer.
     *
     * @private function of `runUserChatJob`
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
     * @private function of `runUserChatJob`
     */
    const scheduleAssistantMessageUpdate = (force = false): void => {
        if (hasQueuedCompletedPersistence || hasPersistedCompletedState) {
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

        queueAssistantMessageUpdate((message) => ({
            ...message,
            content: latestContent,
            ongoingToolCalls: latestToolCalls,
            lifecycleState: 'running',
            lifecycleError: undefined,
            isComplete: false,
        }), {
            snapshotSignature,
        });
    };

    /**
     * Persists the durable completion state immediately after the visible output stream ends.
     *
     * @private function of `runUserChatJob`
     */
    const queueCompletedPersistence = (): void => {
        if (hasQueuedCompletedPersistence) {
            return;
        }

        hasQueuedCompletedPersistence = true;
        clearScheduledAssistantMessageUpdate();
        hasPendingAssistantMessageUpdate = false;
        clearInterval(heartbeatTimer);
        persistQueue = persistQueue.then(async () => {
            await persistUserChatJobTerminalState({
                job,
                status: 'COMPLETED',
                content: latestContent,
                toolCalls: latestToolCalls,
                availableTools,
                provider,
                generationDurationMs: Date.now() - startedAt,
            });
            hasPersistedCompletedState = true;
        });
    };

    try {
        const response = await agent.callChatModelStream!(
            {
                title: `Chat with agent ${resolvedAgentName}`,
                parameters: promptParameters,
                modelRequirements: {
                    modelVariant: 'CHAT',
                },
                content: userMessage.content,
                thread,
                attachments: userMessage.attachments,
                ...(runtimeTools.length > 0 ? { tools: runtimeTools } : {}),
            },
            (chunk: ChatPromptResult & { isFinished?: boolean }) => {
                latestContent = chunk.content ?? latestContent;
                latestToolCalls = chunk.toolCalls
                    ? mergeToolCalls(latestToolCalls, prepareToolCallsForStreaming(chunk.toolCalls))
                    : latestToolCalls;

                if (chunk.isFinished === true) {
                    scheduleAssistantMessageUpdate(true);
                    queueCompletedPersistence();
                    return;
                }

                scheduleAssistantMessageUpdate();
            },
            { signal: abortController.signal },
        );

        clearInterval(heartbeatTimer);
        if (hasPendingAssistantMessageUpdate) {
            scheduleAssistantMessageUpdate(true);
        } else {
            clearScheduledAssistantMessageUpdate();
        }
        await persistQueue;

        const normalizedResponse = ensureNonEmptyChatContent({
            content: response.content,
            context: `Durable agent chat ${resolvedAgentName}`,
        });
        const responseContentWithSuffix = appendMessageSuffix(
            normalizedResponse.content,
            resolveMessageSuffixFromAgentSource(agentSource),
        );
        const finalToolCalls = response.toolCalls
            ? mergeToolCalls(latestToolCalls, prepareToolCallsForStreaming(response.toolCalls))
            : latestToolCalls;
        const generationDurationMs = Date.now() - startedAt;

        if (hasQueuedCompletedPersistence) {
            queueAssistantMessageUpdate((message) => ({
                ...message,
                content: responseContentWithSuffix,
                isComplete: true,
                lifecycleState: 'completed',
                lifecycleError: undefined,
                ongoingToolCalls: undefined,
                toolCalls: finalToolCalls ?? message.toolCalls,
                completedToolCalls: finalToolCalls ?? message.completedToolCalls,
                generationDurationMs,
            }));
            await persistQueue;
        } else {
            await persistUserChatJobTerminalState({
                job,
                status: 'COMPLETED',
                content: responseContentWithSuffix,
                toolCalls: finalToolCalls,
                availableTools,
                provider,
                generationDurationMs,
            });
            hasPersistedCompletedState = true;
        }

        if (response.toolCalls && response.toolCalls.length > 0) {
            await logCalendarToolCallsActivity({
                userId: job.userId,
                agentPermanentId,
                toolCalls: response.toolCalls,
            });
        }

        if (!resolvedAgentContext.isBookScopedAgent) {
            const learnedAgentSource = resolveAppendOnlySelfLearningAgentSource({
                unresolvedAgentSourceBeforeLearning: unresolvedAgentSource,
                resolvedAgentSourceBeforeLearning: agentSource,
                resolvedAgentSourceAfterLearning: agent.agentSource.value,
            });

            if (learnedAgentSource !== null) {
                await collection.updateAgentSource(agentPermanentId, learnedAgentSource);
            }
        }

        console.info('[user-chat-job] completed', {
            chatId: job.chatId,
            messageId: job.userMessageId,
            jobId: job.id,
            provider,
            durationMs: generationDurationMs,
        });

        return 'completed';
    } catch (error) {
        clearInterval(heartbeatTimer);
        clearScheduledAssistantMessageUpdate();
        await persistQueue.catch(() => undefined);

        if (hasPersistedCompletedState) {
            console.error('[user-chat-job] follow-up failed after completion', {
                chatId: job.chatId,
                messageId: job.userMessageId,
                jobId: job.id,
                provider,
                error: serializeError(error as Error),
            });

            return 'completed';
        }

        const generationDurationMs = Date.now() - startedAt;

        if (isUserChatNotFoundScopeError(error)) {
            await finalizeUserChatJob({
                jobId: job.id,
                status: 'CANCELLED',
                provider,
                failureReason: USER_CHAT_JOB_MISSING_CHAT_FAILURE_REASON,
            });

            console.info('[user-chat-job] cancelled_missing_chat_during_run', {
                chatId: job.chatId,
                messageId: job.userMessageId,
                jobId: job.id,
                provider,
                durationMs: generationDurationMs,
            });

            return 'cancelled';
        }

        const failureReason = resolveUserChatJobFailureReason(error);

        if (isCancellationRequested || isUserChatJobCancelledError(error)) {
            await persistUserChatJobTerminalState({
                job,
                status: 'CANCELLED',
                content: latestContent,
                toolCalls: latestToolCalls,
                availableTools,
                provider,
                failureReason,
                generationDurationMs,
            });

            console.info('[user-chat-job] cancelled', {
                chatId: job.chatId,
                messageId: job.userMessageId,
                jobId: job.id,
                provider,
                durationMs: generationDurationMs,
            });

            return 'cancelled';
        }

        await persistUserChatJobTerminalState({
            job,
            status: 'FAILED',
            content: latestContent,
            toolCalls: latestToolCalls,
            availableTools,
            provider,
            failureReason,
            generationDurationMs,
        });

        console.error('[user-chat-job] failed', {
            chatId: job.chatId,
            messageId: job.userMessageId,
            jobId: job.id,
            provider,
            durationMs: generationDurationMs,
            error: serializeError(error as Error),
        });

        return 'failed';
    }
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
 * Builds a stable signature for one persisted running-assistant snapshot.
 *
 * @private function of `userChat`
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
