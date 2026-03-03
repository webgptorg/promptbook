import { isPrivateModeEnabledFromRequest } from '@/src/utils/privateMode';
import { getUserChat } from '@/src/utils/userChat';
import {
    getActiveStreamingExecutionsForChat,
    getLatestFinishedStreamingExecutionForChat,
    getStreamingExecution,
} from '@/src/utils/chat/streamingExecution';
import type { ChatMessage, ToolCall } from '@promptbook-local/types';
import { resolveUserChatScope } from '../user-chats/resolveUserChatScope';

/**
 * SSE update event for chat synchronization.
 *
 * @private internal utility of chat-updates route
 */
type ChatUpdateEvent = {
    type: 'EXECUTION_DELTA' | 'EXECUTION_COMPLETED' | 'EXECUTION_FAILED' | 'MESSAGES_UPDATED';
    executionId?: string;
    delta?: string;
    toolCalls?: ReadonlyArray<ToolCall>;
    assistantMessage?: ChatMessage;
    messages?: ReadonlyArray<ChatMessage>;
    error?: Record<string, unknown>;
    timestamp: string;
};

/**
 * Maximum SSE connection duration (5 minutes).
 *
 * @private internal constant of chat-updates route
 */
const MAX_SSE_DURATION_MS = 5 * 60 * 1000;

/**
 * Interval for polling database for updates.
 *
 * @private internal constant of chat-updates route
 */
const POLLING_INTERVAL_MS = 500;

/**
 * Interval for sending keep-alive pings.
 *
 * @private internal constant of chat-updates route
 */
const KEEP_ALIVE_INTERVAL_MS = 15000;

/**
 * Formats one SSE payload line.
 *
 * @private internal utility of chat-updates route
 */
function formatSSE(event: string, data: unknown): string {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Formats one SSE keep-alive comment.
 *
 * @private internal utility of chat-updates route
 */
function formatKeepAlive(): string {
    return ': keep-alive\n\n';
}

/**
 * Converts timestamp-like values into Date objects.
 *
 * @private internal utility of chat-updates route
 */
function normalizeToDate(value: Date | string): Date {
    return value instanceof Date ? value : new Date(value);
}

/**
 * Normalizes optional query value.
 *
 * @private internal utility of chat-updates route
 */
function normalizeOptionalString(value: string | null | undefined): string | undefined {
    if (!value) {
        return undefined;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
}

/**
 * Server-Sent Events endpoint for real-time chat updates.
 *
 * Allows multiple browser windows to see the same chat synchronized in real-time.
 * Continues streaming even if user refreshes the browser.
 *
 * @private exported from Agents Server API
 */
export async function GET(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    if (isPrivateModeEnabledFromRequest(request)) {
        return new Response(JSON.stringify({ error: 'Private mode is enabled.' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const { agentName: rawAgentName } = await params;
    const agentName = decodeURIComponent(rawAgentName);
    const url = new URL(request.url);
    const chatId = normalizeOptionalString(url.searchParams.get('chatId'));

    if (!chatId) {
        return new Response(JSON.stringify({ error: 'Missing chatId parameter' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const scopeResult = await resolveUserChatScope(agentName);
    if (!scopeResult.ok) {
        if (scopeResult.error === 'UNAUTHORIZED') {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ error: 'Agent not found.' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const initialChat = await getUserChat({
        userId: scopeResult.scope.userId,
        agentPermanentId: scopeResult.scope.agentPermanentId,
        chatId,
    });
    if (!initialChat) {
        return new Response(JSON.stringify({ error: 'Chat not found.' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const encoder = new TextEncoder();
    let isClosed = false;
    let lastActiveExecutionUpdateTime = new Date(0);
    let lastFinishedExecutionUpdateTime = new Date(0);
    let lastMessagesUpdateTime = normalizeToDate(initialChat.updatedAt);

    const stream = new ReadableStream({
        async start(controller) {
            let keepAliveInterval: ReturnType<typeof setInterval> | null = null;
            let pollingInterval: ReturnType<typeof setInterval> | null = null;
            let connectionTimeout: ReturnType<typeof setTimeout> | null = null;

            /**
             * Closes current SSE connection and clears timers.
             *
             * @private internal utility of chat-updates route
             */
            const cleanup = () => {
                if (isClosed) {
                    return;
                }
                isClosed = true;

                if (keepAliveInterval) {
                    clearInterval(keepAliveInterval);
                    keepAliveInterval = null;
                }
                if (pollingInterval) {
                    clearInterval(pollingInterval);
                    pollingInterval = null;
                }
                if (connectionTimeout) {
                    clearTimeout(connectionTimeout);
                    connectionTimeout = null;
                }

                try {
                    controller.close();
                } catch {
                    // Stream may already be closed by runtime.
                }
            };

            /**
             * Sends one typed SSE update event.
             *
             * @private internal utility of chat-updates route
             */
            const sendUpdate = (event: ChatUpdateEvent) => {
                if (isClosed) {
                    return;
                }

                controller.enqueue(encoder.encode(formatSSE('update', event)));
            };

            /**
             * Reads active execution rows and emits delta updates.
             *
             * @private internal utility of chat-updates route
             */
            const pollActiveExecutionUpdates = async () => {
                const activeExecutions = await getActiveStreamingExecutionsForChat(chatId);
                for (const execution of activeExecutions) {
                    const executionUpdatedAt = normalizeToDate(execution.updatedAt);
                    if (executionUpdatedAt <= lastActiveExecutionUpdateTime) {
                        continue;
                    }

                    sendUpdate({
                        type: 'EXECUTION_DELTA',
                        executionId: execution.id,
                        delta: execution.assistantMessageDelta,
                        toolCalls: execution.toolCalls || undefined,
                        timestamp: new Date().toISOString(),
                    });
                    lastActiveExecutionUpdateTime = executionUpdatedAt;
                }
            };

            /**
             * Reads finished execution rows and emits completion/failure updates.
             *
             * @private internal utility of chat-updates route
             */
            const pollFinishedExecutionUpdates = async () => {
                const recentFinishedExecution = await getLatestFinishedStreamingExecutionForChat({
                    userChatId: chatId,
                    updatedAfter: lastFinishedExecutionUpdateTime,
                });
                if (!recentFinishedExecution) {
                    return;
                }

                const execution = await getStreamingExecution(recentFinishedExecution.id);
                if (!execution) {
                    return;
                }

                if (execution.status === 'COMPLETED' && execution.assistantMessage) {
                    sendUpdate({
                        type: 'EXECUTION_COMPLETED',
                        executionId: execution.id,
                        assistantMessage: execution.assistantMessage,
                        toolCalls: execution.toolCalls || undefined,
                        timestamp: new Date().toISOString(),
                    });
                } else if (execution.status === 'FAILED' && execution.error) {
                    sendUpdate({
                        type: 'EXECUTION_FAILED',
                        executionId: execution.id,
                        error: execution.error,
                        timestamp: new Date().toISOString(),
                    });
                }

                lastFinishedExecutionUpdateTime = normalizeToDate(recentFinishedExecution.updatedAt);
            };

            /**
             * Reads chat messages and emits synchronized snapshot updates.
             *
             * @private internal utility of chat-updates route
             */
            const pollChatMessageUpdates = async () => {
                const refreshedChat = await getUserChat({
                    userId: scopeResult.scope.userId,
                    agentPermanentId: scopeResult.scope.agentPermanentId,
                    chatId,
                });
                if (!refreshedChat) {
                    cleanup();
                    return;
                }

                const updatedAt = normalizeToDate(refreshedChat.updatedAt);
                if (updatedAt <= lastMessagesUpdateTime) {
                    return;
                }

                sendUpdate({
                    type: 'MESSAGES_UPDATED',
                    messages: refreshedChat.messages,
                    timestamp: new Date().toISOString(),
                });
                lastMessagesUpdateTime = updatedAt;
            };

            /**
             * Polls all chat synchronization sources.
             *
             * @private internal utility of chat-updates route
             */
            const pollForUpdates = async () => {
                if (isClosed) {
                    return;
                }

                try {
                    await pollActiveExecutionUpdates();
                    await pollFinishedExecutionUpdates();
                    await pollChatMessageUpdates();
                } catch (error) {
                    console.error('[SSE] Error polling for updates:', error);
                }
            };

            sendUpdate({
                type: 'MESSAGES_UPDATED',
                messages: initialChat.messages,
                timestamp: new Date().toISOString(),
            });

            connectionTimeout = setTimeout(cleanup, MAX_SSE_DURATION_MS);
            keepAliveInterval = setInterval(() => {
                if (isClosed) {
                    return;
                }
                try {
                    controller.enqueue(encoder.encode(formatKeepAlive()));
                } catch {
                    cleanup();
                }
            }, KEEP_ALIVE_INTERVAL_MS);
            pollingInterval = setInterval(() => {
                void pollForUpdates();
            }, POLLING_INTERVAL_MS);

            request.signal.addEventListener('abort', cleanup, { once: true });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Access-Control-Allow-Origin': '*',
        },
    });
}
