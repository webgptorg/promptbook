import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideOpenAiAgentKitExecutionToolsForServer } from '@/src/tools/$provideOpenAiAgentKitExecutionToolsForServer';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import { resolveCachedServerAgentContext } from '@/src/utils/cachedServerAgentRuntime';
import { ensureNonEmptyChatContent } from '@/src/utils/chat/ensureNonEmptyChatContent';
import { appendMessageSuffix, resolveMessageSuffixFromAgentSource } from '@/src/utils/chat/messageSuffix';
import { resolveCurrentOrInternalServerOrigin } from '@/src/utils/resolveCurrentOrInternalServerOrigin';
import type { ChatMessage, ChatPrompt } from '@promptbook-local/types';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import type { ChatPromptResult } from '../../../../../src/execution/PromptResult';
import { createImmediateUserChatAnswerModelRequirements } from './createImmediateUserChatAnswerModelRequirements';
import { getUserChat } from './getUserChat';
import { getUserChatJobById } from './getUserChatJobById';
import { mutateUserChat } from './mutateUserChat';
import type { UserChatJobParameters, UserChatJobRecord } from './UserChatJobRecord';
import { createReplyAwareUserChatPromptContent, createReplyAwareUserChatPromptMessage } from './userChatReplies';
import { resolvePromptThreadBeforeUserMessage } from './userChatMessageLifecycle';

/**
 * Minimum interval between persisted immediate-answer snapshots.
 */
const IMMEDIATE_USER_CHAT_ANSWER_PERSIST_INTERVAL_MS = 1_000;

/**
 * Result returned from one immediate user-chat answer attempt.
 */
export type ImmediateUserChatAnswerResult = 'completed' | 'skipped' | 'failed';

/**
 * Context needed to generate one immediate answer for a queued durable chat job.
 */
type ImmediateUserChatAnswerContext = {
    prompt: Pick<ChatPrompt, 'title' | 'parameters' | 'modelRequirements' | 'content' | 'thread' | 'attachments'>;
    messageSuffix: ReturnType<typeof resolveMessageSuffixFromAgentSource>;
    resolvedAgentName: string;
};

/**
 * Optional pre-resolved agent context from the message enqueue route.
 */
type RunImmediateUserChatAnswerOptions = {
    agentSource?: string_book;
    resolvedAgentName?: string;
};

/**
 * Runs a fast local LLM answer into the incomplete assistant placeholder while the external runner is still working.
 */
export async function runImmediateUserChatAnswer(
    job: UserChatJobRecord,
    options: RunImmediateUserChatAnswerOptions = {},
): Promise<ImmediateUserChatAnswerResult> {
    const context = await resolveImmediateUserChatAnswerContext(job, options);
    if (!context) {
        return 'skipped';
    }

    const abortController = new AbortController();
    const persistenceController = createImmediateUserChatAnswerPersistenceController({
        job,
        abortController,
    });

    try {
        const tools = await $provideOpenAiAgentKitExecutionToolsForServer();
        const response = await tools.callChatModelStream(
            context.prompt as ChatPrompt,
            persistenceController.handleStreamChunk,
            { signal: abortController.signal },
        );
        const normalizedResponse = ensureNonEmptyChatContent({
            content: response.content,
            context: `Immediate agent chat ${context.resolvedAgentName}`,
        });

        await persistenceController.persistLatestContent(
            appendMessageSuffix(normalizedResponse.content, context.messageSuffix),
            true,
        );
        await persistenceController.flush();

        return 'completed';
    } catch (error) {
        await persistenceController.settleAfterError();

        if (abortController.signal.aborted) {
            return 'skipped';
        }

        console.error('[user-chat] Failed to generate immediate chat answer', {
            chatId: job.chatId,
            jobId: job.id,
            error,
        });

        return 'failed';
    }
}

/**
 * Resolves the prompt context for one immediate answer, skipping stale or missing jobs.
 */
async function resolveImmediateUserChatAnswerContext(
    job: UserChatJobRecord,
    options: RunImmediateUserChatAnswerOptions,
): Promise<ImmediateUserChatAnswerContext | null> {
    const currentJob = await getUserChatJobById(job.id);
    if (!isUserChatJobStillWaitingForExternalAnswer(currentJob)) {
        return null;
    }

    const chat = await getUserChat({
        userId: job.userId,
        agentPermanentId: job.agentPermanentId,
        chatId: job.chatId,
    });

    if (!chat) {
        return null;
    }

    const userMessage = chat.messages.find((message) => message.id === job.userMessageId);
    if (!userMessage) {
        return null;
    }

    const resolvedAgentContext =
        options.agentSource && options.resolvedAgentName
            ? {
                  resolvedAgentSource: options.agentSource,
                  resolvedAgentName: options.resolvedAgentName,
              }
            : await resolveImmediateUserChatAgentContext(job.agentPermanentId);
    const agentSource = resolvedAgentContext.resolvedAgentSource;

    return {
        prompt: {
            title: `Immediate chat with agent ${resolvedAgentContext.resolvedAgentName}`,
            parameters: normalizeImmediateUserChatPromptParameters(job.parameters),
            modelRequirements: createImmediateUserChatAnswerModelRequirements(agentSource),
            content: createReplyAwareUserChatPromptContent(userMessage),
            thread: resolveImmediateUserChatAnswerThread(chat.messages, job.userMessageId),
            attachments: userMessage.attachments,
        },
        messageSuffix: resolveMessageSuffixFromAgentSource(agentSource),
        resolvedAgentName: resolvedAgentContext.resolvedAgentName,
    };
}

/**
 * Resolves full agent context only when the caller did not provide the route's already resolved source.
 */
async function resolveImmediateUserChatAgentContext(agentPermanentId: string) {
    const [collection, baseAgentReferenceResolver, localServerUrl] = await Promise.all([
        $provideAgentCollectionForServer(),
        $provideAgentReferenceResolver(),
        resolveCurrentOrInternalServerOrigin(),
    ]);

    return resolveCachedServerAgentContext({
        collection,
        agentIdentifier: agentPermanentId,
        localServerUrl,
        fallbackResolver: baseAgentReferenceResolver,
    });
}

/**
 * Converts persisted JSON chat parameters into string prompt parameters without adding slow runtime context.
 */
function normalizeImmediateUserChatPromptParameters(parameters: UserChatJobParameters): Record<string, string> {
    const normalizedEntries: Array<[string, string]> = [];

    for (const [key, value] of Object.entries(parameters)) {
        if (value === undefined || value === null) {
            continue;
        }

        if (typeof value === 'string') {
            normalizedEntries.push([key, value]);
            continue;
        }

        normalizedEntries.push([key, JSON.stringify(value)]);
    }

    return Object.fromEntries(normalizedEntries);
}

/**
 * Builds the already completed conversation thread available before the current user turn.
 */
function resolveImmediateUserChatAnswerThread(
    messages: ReadonlyArray<ChatMessage>,
    userMessageId: string,
): Array<ChatMessage> {
    return resolvePromptThreadBeforeUserMessage(messages, userMessageId)
        .filter((message) => message.isComplete !== false)
        .filter((message) => message.sender === 'USER' || message.sender === 'AGENT')
        .map(createReplyAwareUserChatPromptMessage);
}

/**
 * Creates throttled persistence for immediate streamed answer snapshots.
 */
function createImmediateUserChatAnswerPersistenceController(options: {
    job: Pick<UserChatJobRecord, 'id' | 'userId' | 'agentPermanentId' | 'chatId' | 'assistantMessageId'>;
    abortController: AbortController;
}) {
    let latestContent = '';
    let persistQueue: Promise<void> = Promise.resolve();
    let lastAssistantMessagePersistedAt = 0;
    let lastPersistedContent = '';
    let isAssistantMessageUpdatePending = false;
    let assistantMessageUpdateTimeout: ReturnType<typeof setTimeout> | null = null;

    /**
     * Clears any delayed persistence timer.
     */
    const clearScheduledAssistantMessageUpdate = (): void => {
        if (!assistantMessageUpdateTimeout) {
            return;
        }

        clearTimeout(assistantMessageUpdateTimeout);
        assistantMessageUpdateTimeout = null;
    };

    /**
     * Queues the latest content snapshot after checking that the external job still owns the message.
     */
    const queueAssistantMessageUpdate = (content: string): void => {
        persistQueue = persistQueue
            .then(async () => {
                const currentJob = await getUserChatJobById(options.job.id);
                if (!isUserChatJobStillWaitingForExternalAnswer(currentJob)) {
                    options.abortController.abort();
                    return;
                }

                await mutateUserChat({
                    userId: options.job.userId,
                    agentPermanentId: options.job.agentPermanentId,
                    chatId: options.job.chatId,
                    mutate: (currentChat) => {
                        const nextMessages = currentChat.messages.map((message) => {
                            if (message.id !== options.job.assistantMessageId || message.isComplete !== false) {
                                return message;
                            }

                            const updatedMessage: ChatMessage = {
                                ...message,
                                content,
                                isComplete: false,
                                lifecycleState: 'running',
                                lifecycleError: undefined,
                            };

                            return updatedMessage;
                        });

                        return {
                            messages: nextMessages,
                        };
                    },
                });

                lastPersistedContent = content;
            })
            .catch((error) => {
                console.error('[user-chat] Failed to persist immediate chat answer chunk', {
                    chatId: options.job.chatId,
                    jobId: options.job.id,
                    error,
                });
            });
    };

    /**
     * Schedules a persisted snapshot of the latest immediate answer content.
     */
    const scheduleAssistantMessageUpdate = (isForced = false): void => {
        if (options.abortController.signal.aborted) {
            clearScheduledAssistantMessageUpdate();
            isAssistantMessageUpdatePending = false;
            return;
        }

        const normalizedContent = latestContent.trim().length > 0 ? latestContent : '';
        if (!normalizedContent || normalizedContent === lastPersistedContent) {
            return;
        }

        const now = Date.now();
        const remainingDelayMs =
            IMMEDIATE_USER_CHAT_ANSWER_PERSIST_INTERVAL_MS - (now - lastAssistantMessagePersistedAt);

        if (!isForced && remainingDelayMs > 0) {
            isAssistantMessageUpdatePending = true;

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
        isAssistantMessageUpdatePending = false;
        lastAssistantMessagePersistedAt = now;
        queueAssistantMessageUpdate(normalizedContent);
    };

    return {
        handleStreamChunk: (chunk: ChatPromptResult): void => {
            latestContent = chunk.content ?? latestContent;
            scheduleAssistantMessageUpdate();
        },
        persistLatestContent: async (content: string, force = false): Promise<void> => {
            latestContent = content;
            scheduleAssistantMessageUpdate(force);
            await persistQueue;
        },
        flush: async (): Promise<void> => {
            if (isAssistantMessageUpdatePending) {
                scheduleAssistantMessageUpdate(true);
            } else {
                clearScheduledAssistantMessageUpdate();
            }

            await persistQueue;
        },
        settleAfterError: async (): Promise<void> => {
            clearScheduledAssistantMessageUpdate();
            isAssistantMessageUpdatePending = false;
            await persistQueue.catch(() => undefined);
        },
    };
}

/**
 * Returns true when the durable external job may still be updated by the immediate answer.
 */
function isUserChatJobStillWaitingForExternalAnswer(job: UserChatJobRecord | null): job is UserChatJobRecord {
    return Boolean(job && !job.cancelRequestedAt && (job.status === 'QUEUED' || job.status === 'RUNNING'));
}
