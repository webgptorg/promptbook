import { getActiveStreamingExecutionsForChat, getStreamingExecution } from '@/src/utils/chat/streamingExecution';
import { $provideClientSql } from '@/src/database/$provideClientSql';
import type { ChatMessage, ToolCall } from '@promptbook-local/types';

/**
 * SSE update event for chat synchronization
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
 * Maximum SSE connection duration (5 minutes)
 *
 * @private internal constant of chat-updates route
 */
const MAX_SSE_DURATION_MS = 5 * 60 * 1000;

/**
 * Interval for polling database for updates
 *
 * @private internal constant of chat-updates route
 */
const POLLING_INTERVAL_MS = 500;

/**
 * Interval for sending keep-alive pings
 *
 * @private internal constant of chat-updates route
 */
const KEEP_ALIVE_INTERVAL_MS = 15000;

/**
 * Server-Sent Events endpoint for real-time chat updates
 *
 * Allows multiple browser windows to see the same chat synchronized in real-time.
 * Continues streaming even if user refreshes the browser.
 *
 * @private exported from Agents Server API
 */
export async function GET(request: Request) {
    // Extract chat ID from query parameters
    const url = new URL(request.url);
    const chatId = url.searchParams.get('chatId');

    if (!chatId) {
        return new Response(
            JSON.stringify({ error: 'Missing chatId parameter' }),
            {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            },
        );
    }

    const encoder = new TextEncoder();
    let lastUpdateTime = new Date();
    let isClosed = false;

    /**
     * Formats an SSE message
     *
     * @private internal utility of chat-updates route
     */
    const formatSSE = (event: string, data: unknown): string => {
        return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    };

    /**
     * Sends a keep-alive comment
     *
     * @private internal utility of chat-updates route
     */
    const formatKeepAlive = (): string => {
        return ': keep-alive\n\n';
    };

    const stream = new ReadableStream({
        async start(controller) {
            let keepAliveInterval: ReturnType<typeof setInterval> | null = null;
            let pollingInterval: ReturnType<typeof setInterval> | null = null;
            let connectionTimeout: ReturnType<typeof setTimeout> | null = null;

            const cleanup = () => {
                if (isClosed) {
                    return;
                }
                isClosed = true;

                if (keepAliveInterval) {
                    clearInterval(keepAliveInterval);
                }
                if (pollingInterval) {
                    clearInterval(pollingInterval);
                }
                if (connectionTimeout) {
                    clearTimeout(connectionTimeout);
                }

                try {
                    controller.close();
                } catch {
                    // Stream may already be closed
                }
            };

            // Set up automatic connection timeout
            connectionTimeout = setTimeout(() => {
                cleanup();
            }, MAX_SSE_DURATION_MS);

            // Send keep-alive pings
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

            // Poll for updates
            pollingInterval = setInterval(async () => {
                if (isClosed) {
                    return;
                }

                try {
                    const sql = await $provideClientSql();

                    // Check for streaming execution updates
                    const activeExecutions = await getActiveStreamingExecutionsForChat(chatId);

                    for (const execution of activeExecutions) {
                        if (new Date(execution.updatedAt) > lastUpdateTime) {
                            const event: ChatUpdateEvent = {
                                type: 'EXECUTION_DELTA',
                                executionId: execution.id,
                                delta: execution.assistantMessageDelta,
                                toolCalls: execution.toolCalls || undefined,
                                timestamp: new Date().toISOString(),
                            };

                            controller.enqueue(encoder.encode(formatSSE('update', event)));
                            lastUpdateTime = new Date(execution.updatedAt);
                        }
                    }

                    // Check for completed executions
                    const [recentCompletedExecution] = await sql<Array<{ id: string; updatedAt: Date; status: string }>>`
                        SELECT "id", "updatedAt", "status"
                        FROM "ChatStreamingExecution"
                        WHERE "userChatId" = ${chatId}
                        AND "status" IN ('COMPLETED', 'FAILED')
                        AND "updatedAt" > ${lastUpdateTime}
                        ORDER BY "updatedAt" DESC
                        LIMIT 1
                    `;

                    if (recentCompletedExecution) {
                        const execution = await getStreamingExecution(recentCompletedExecution.id);
                        if (execution) {
                            if (execution.status === 'COMPLETED' && execution.assistantMessage) {
                                const event: ChatUpdateEvent = {
                                    type: 'EXECUTION_COMPLETED',
                                    executionId: execution.id,
                                    assistantMessage: execution.assistantMessage,
                                    toolCalls: execution.toolCalls || undefined,
                                    timestamp: new Date().toISOString(),
                                };
                                controller.enqueue(encoder.encode(formatSSE('update', event)));
                            } else if (execution.status === 'FAILED' && execution.error) {
                                const event: ChatUpdateEvent = {
                                    type: 'EXECUTION_FAILED',
                                    executionId: execution.id,
                                    error: execution.error,
                                    timestamp: new Date().toISOString(),
                                };
                                controller.enqueue(encoder.encode(formatSSE('update', event)));
                            }
                            lastUpdateTime = new Date(recentCompletedExecution.updatedAt);
                        }
                    }

                    // Check for UserChat message updates (from other clients)
                    const [chatUpdate] = await sql<Array<{ updatedAt: Date; messages: string }>>`
                        SELECT "updatedAt", "messages"
                        FROM "UserChat"
                        WHERE "id" = ${chatId}
                        AND "updatedAt" > ${lastUpdateTime}
                    `;

                    if (chatUpdate) {
                        const messages = typeof chatUpdate.messages === 'string'
                            ? JSON.parse(chatUpdate.messages)
                            : chatUpdate.messages;

                        const event: ChatUpdateEvent = {
                            type: 'MESSAGES_UPDATED',
                            messages,
                            timestamp: new Date().toISOString(),
                        };

                        controller.enqueue(encoder.encode(formatSSE('update', event)));
                        lastUpdateTime = new Date(chatUpdate.updatedAt);
                    }
                } catch (error) {
                    console.error('[SSE] Error polling for updates:', error);
                }
            }, POLLING_INTERVAL_MS);

            // Handle client disconnect
            request.signal.addEventListener('abort', () => {
                cleanup();
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
        },
    });
}
