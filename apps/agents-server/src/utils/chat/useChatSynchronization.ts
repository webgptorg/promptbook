'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChatMessage, ToolCall } from '@promptbook-local/types';

/**
 * Chat update event types from SSE
 *
 * @private internal type of useChatSynchronization hook
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
 * Hook for real-time chat synchronization across browser windows
 *
 * Connects to SSE endpoint and listens for updates to the chat.
 * Updates are applied to the local messages array.
 *
 * @public exported from Agents Server utils
 */
export function useChatSynchronization(params: {
    agentName: string;
    chatId: string | null;
    isEnabled: boolean;
    onMessagesUpdate?: (messages: ReadonlyArray<ChatMessage>) => void;
    onDeltaUpdate?: (delta: string) => void;
}): {
    isConnected: boolean;
    lastUpdate: Date | null;
} {
    const { agentName, chatId, isEnabled, onMessagesUpdate, onDeltaUpdate } = params;
    const [isConnected, setIsConnected] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const currentExecutionIdRef = useRef<string | null>(null);
    const accumulatedDeltaRef = useRef<string>('');

    useEffect(() => {
        if (!isEnabled || !chatId) {
            return;
        }

        const url = `/agents/${encodeURIComponent(agentName)}/api/chat-updates?chatId=${encodeURIComponent(chatId)}`;
        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.addEventListener('open', () => {
            setIsConnected(true);
        });

        eventSource.addEventListener('update', (event) => {
            try {
                const data = JSON.parse(event.data) as ChatUpdateEvent;
                setLastUpdate(new Date(data.timestamp));

                switch (data.type) {
                    case 'EXECUTION_DELTA':
                        if (data.executionId !== currentExecutionIdRef.current) {
                            // New execution started, reset accumulated delta
                            currentExecutionIdRef.current = data.executionId || null;
                            accumulatedDeltaRef.current = '';
                        }

                        if (data.delta && onDeltaUpdate) {
                            // Calculate the new delta by comparing with accumulated
                            const newDelta = data.delta.substring(accumulatedDeltaRef.current.length);
                            if (newDelta) {
                                accumulatedDeltaRef.current = data.delta;
                                onDeltaUpdate(newDelta);
                            }
                        }
                        break;

                    case 'EXECUTION_COMPLETED':
                        if (data.assistantMessage && onMessagesUpdate) {
                            // The server will update UserChat.messages, which will trigger MESSAGES_UPDATED
                            // We don't need to do anything here except clear the current execution
                            currentExecutionIdRef.current = null;
                            accumulatedDeltaRef.current = '';
                        }
                        break;

                    case 'EXECUTION_FAILED':
                        console.error('[Chat sync] Execution failed:', data.error);
                        currentExecutionIdRef.current = null;
                        accumulatedDeltaRef.current = '';
                        break;

                    case 'MESSAGES_UPDATED':
                        if (data.messages && onMessagesUpdate) {
                            onMessagesUpdate(data.messages);
                        }
                        break;
                }
            } catch (error) {
                console.error('[Chat sync] Failed to parse SSE message:', error);
            }
        });

        eventSource.addEventListener('error', (error) => {
            console.error('[Chat sync] SSE error:', error);
            setIsConnected(false);
        });

        return () => {
            eventSource.close();
            eventSourceRef.current = null;
            setIsConnected(false);
        };
    }, [agentName, chatId, isEnabled, onMessagesUpdate, onDeltaUpdate]);

    return {
        isConnected,
        lastUpdate,
    };
}
