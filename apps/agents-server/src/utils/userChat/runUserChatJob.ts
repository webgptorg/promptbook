import { NEXT_PUBLIC_SITE_URL } from '@/config';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideOpenAiAgentKitExecutionToolsForServer } from '@/src/tools/$provideOpenAiAgentKitExecutionToolsForServer';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import { resolveBookScopedAgentContext } from '@/src/utils/agentReferenceResolver/bookScopedAgentReferences';
import { AgentKitCacheManager } from '@/src/utils/cache/AgentKitCacheManager';
import { composePromptParametersWithMemoryContext } from '@/src/utils/memoryRuntimeContext';
import { extractUseEmailConfigurationFromAgentSource } from '@/src/utils/emails/extractUseEmailConfigurationFromAgentSource';
import { getUserById } from '@/src/utils/getUserById';
import { getWellKnownAgentUrl } from '@/src/utils/getWellKnownAgentUrl';
import { extractProjectRepositoriesFromAgentSource } from '@/src/utils/projects/extractProjectRepositoriesFromAgentSource';
import { resolveUseEmailSmtpCredential } from '@/src/utils/resolveUseEmailSmtpCredential';
import { resolveUseProjectGithubToken } from '@/src/utils/resolveUseProjectGithubToken';
import {
    AGENT_PREPARATION_CHAT_WAIT_TIMEOUT_MS,
    resolveAgentCollectionTablePrefix,
    waitForRunningAgentPreparation,
} from '@/src/utils/agentPreparation';
import { prepareToolCallsForStreaming } from '@/src/utils/toolCallStreaming';
import { Agent, computeAgentHash, RemoteAgent } from '@promptbook-local/core';
import type { ToolCall } from '@promptbook-local/types';
import { serializeError } from '@promptbook-local/utils';
import { ensureNonEmptyChatContent } from '@/src/utils/chat/ensureNonEmptyChatContent';
import { appendMessageSuffix, resolveMessageSuffixFromAgentSource } from '@/src/utils/chat/messageSuffix';
import { getUserChat } from './getUserChat';
import { heartbeatUserChatJob } from './heartbeatUserChatJob';
import { persistUserChatJobTerminalState } from './persistUserChatJobTerminalState';
import type { UserChatJobRecord } from './UserChatJobRecord';
import { resolvePromptThreadBeforeUserMessage } from './userChatMessageLifecycle';
import { updateUserChatAssistantMessage } from './updateUserChatAssistantMessage';

/**
 * Heartbeat cadence used while one chat job is actively streaming.
 *
 * @private function of `userChat`
 */
const USER_CHAT_JOB_HEARTBEAT_INTERVAL_MS = 5_000;

/**
 * Error name used when a running durable chat job is cancelled.
 *
 * @private function of `userChat`
 */
const USER_CHAT_JOB_CANCELLED_ERROR_NAME = 'UserChatJobCancelledError';

/**
 * Runs one claimed durable chat job to completion.
 */
export async function runUserChatJob(job: UserChatJobRecord): Promise<'completed' | 'failed' | 'cancelled'> {
    const chat = await getUserChat({
        userId: job.userId,
        agentPermanentId: job.agentPermanentId,
        chatId: job.chatId,
    });

    if (!chat) {
        throw new Error(`User chat "${job.chatId}" was not found for durable job "${job.id}".`);
    }

    const userRow = await getUserById(job.userId);
    if (!userRow) {
        throw new Error(`User "${job.userId}" was not found for durable job "${job.id}".`);
    }

    const userMessage = chat.messages.find((message) => message.id === job.userMessageId);
    if (!userMessage) {
        throw new Error(`User message "${job.userMessageId}" was not found in chat "${job.chatId}".`);
    }

    const thread = resolvePromptThreadBeforeUserMessage(chat.messages, job.userMessageId);
    const collection = await $provideAgentCollectionForServer();
    const baseAgentReferenceResolver = await $provideAgentReferenceResolver();
    const resolvedAgentContext = await resolveBookScopedAgentContext({
        collection,
        agentIdentifier: job.agentPermanentId,
        localServerUrl: resolveLocalServerOrigin(),
        fallbackResolver: baseAgentReferenceResolver,
    });
    const agentSource = resolvedAgentContext.resolvedAgentSource;
    const agentPermanentId = resolvedAgentContext.parentAgentPermanentId;
    const resolvedAgentName = resolvedAgentContext.resolvedAgentName;
    const projectRepositories = extractProjectRepositoriesFromAgentSource(agentSource);
    const useEmailConfiguration = extractUseEmailConfigurationFromAgentSource(agentSource);
    const projectGithubToken = await resolveUseProjectGithubToken({
        userId: job.userId,
        agentPermanentId,
    });
    const emailSmtpCredential = useEmailConfiguration.isEnabled
        ? await resolveUseEmailSmtpCredential({
              userId: job.userId,
              agentPermanentId,
          })
        : undefined;
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
        isPrivateModeEnabled: false,
        projectRepositories,
        projectGithubToken,
        emailSmtpCredential,
        emailFromAddress: useEmailConfiguration.senderEmail,
    });
    const agentKitCacheManager = new AgentKitCacheManager({ isVerbose: true });
    const baseOpenAiTools = await $provideOpenAiAgentKitExecutionToolsForServer();
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
        baseOpenAiTools,
        {
            includeDynamicContext: true,
            agentId: agentPermanentId,
            agentReferenceResolver: resolvedAgentContext.scopedAgentReferenceResolver,
        },
    );
    const provider = agentKitResult.tools.title;
    const agent = new Agent({
        isVerbose: true,
        assistantPreparationMode: 'external',
        executionTools: {
            llm: agentKitResult.tools,
        },
        agentSource,
        teacherAgent: await RemoteAgent.connect({
            agentUrl: await getWellKnownAgentUrl('TEACHER'),
        }),
    });
    const startedAt = Date.now();
    let latestContent = '';
    let latestToolCalls: ReadonlyArray<ToolCall> | undefined;
    let isCancellationRequested = job.cancelRequestedAt !== null;
    let persistQueue: Promise<void> = Promise.resolve();
    const abortController = new AbortController();
    const heartbeatTimer = setInterval(() => {
        persistQueue = persistQueue
            .then(async () => {
                const nextJob = await heartbeatUserChatJob(job.id);
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
                console.error('[user-chat-job] Heartbeat failed', {
                    chatId: job.chatId,
                    messageId: job.userMessageId,
                    jobId: job.id,
                    error: serializeError(heartbeatError as Error),
                });
                abortController.abort(heartbeatError);
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
        }),
    });

    console.info('[user-chat-job] start', {
        chatId: job.chatId,
        messageId: job.userMessageId,
        jobId: job.id,
        provider,
    });

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
            },
            (chunk) => {
                latestContent = chunk.content ?? latestContent;
                latestToolCalls = chunk.toolCalls ? prepareToolCallsForStreaming(chunk.toolCalls) : latestToolCalls;

                persistQueue = persistQueue.then(async () => {
                    await updateUserChatAssistantMessage({
                        userId: job.userId,
                        agentPermanentId: job.agentPermanentId,
                        chatId: job.chatId,
                        assistantMessageId: job.assistantMessageId,
                        mutateMessage: (message) => ({
                            ...message,
                            content: latestContent,
                            ongoingToolCalls: latestToolCalls,
                            lifecycleState: 'running',
                            lifecycleError: undefined,
                            isComplete: false,
                        }),
                    });
                });
            },
            { signal: abortController.signal },
        );

        clearInterval(heartbeatTimer);
        await persistQueue;

        const normalizedResponse = ensureNonEmptyChatContent({
            content: response.content,
            context: `Durable agent chat ${resolvedAgentName}`,
        });
        const responseContentWithSuffix = appendMessageSuffix(
            normalizedResponse.content,
            resolveMessageSuffixFromAgentSource(agentSource),
        );
        const finalToolCalls = response.toolCalls ? prepareToolCallsForStreaming(response.toolCalls) : latestToolCalls;
        const generationDurationMs = Date.now() - startedAt;

        await persistUserChatJobTerminalState({
            job,
            status: 'COMPLETED',
            content: responseContentWithSuffix,
            toolCalls: finalToolCalls,
            provider,
            generationDurationMs,
        });

        if (!resolvedAgentContext.isBookScopedAgent) {
            const newAgentSource = agent.agentSource.value;
            if (newAgentSource !== agentSource) {
                await collection.updateAgentSource(agentPermanentId, newAgentSource);
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
        await persistQueue.catch(() => undefined);

        const failureReason = resolveUserChatJobFailureReason(error);
        const generationDurationMs = Date.now() - startedAt;

        if (isCancellationRequested || isUserChatJobCancelledError(error)) {
            await persistUserChatJobTerminalState({
                job,
                status: 'CANCELLED',
                content: latestContent,
                toolCalls: latestToolCalls,
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
 * Resolves the user-facing failure reason stored in canonical chat history.
 *
 * @private function of `userChat`
 */
function resolveUserChatJobFailureReason(error: unknown): string {
    if (isUserChatJobCancelledError(error)) {
        return 'Chat generation was cancelled.';
    }

    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }

    return 'Chat generation failed.';
}

/**
 * Resolves the local/public server origin used for background scoped-agent lookups.
 *
 * @private function of `userChat`
 */
function resolveLocalServerOrigin(): string {
    if (NEXT_PUBLIC_SITE_URL instanceof URL) {
        return NEXT_PUBLIC_SITE_URL.href.replace(/\/+$/g, '');
    }

    return 'https://localhost:4440';
}
