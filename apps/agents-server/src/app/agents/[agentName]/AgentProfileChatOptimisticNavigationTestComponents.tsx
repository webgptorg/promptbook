import { useLayoutEffect, useRef, type ReactNode } from 'react';

/**
 * Mocked profile-page chat composer used to trigger optimistic-navigation scenarios.
 */
function MockAgentProfileChatOptimisticNavigationChat({
    onMessage,
}: {
    onMessage?: (message: string) => void;
}) {
    return (
        <div>
            <button
                type="button"
                onClick={() => {
                    onMessage?.('Quick hello from profile');
                }}
            >
                Quick hello from profile
            </button>
            <button
                type="button"
                onClick={() => {
                    onMessage?.('Typed hello from profile');
                }}
            >
                Typed hello from profile
            </button>
        </div>
    );
}

/**
 * Mocked loading skeleton for the history-bootstrap page state.
 */
function MockAgentProfileChatOptimisticNavigationAgentChatLoadingSkeleton() {
    return <div data-testid="agent-chat-loading-skeleton" />;
}

/**
 * Mocked loading skeleton for the profile chat thread.
 */
function MockAgentProfileChatOptimisticNavigationChatThreadLoadingSkeleton() {
    return <div data-testid="chat-thread-loading-skeleton" />;
}

/**
 * Mocked wrapper for the full-page chat surface.
 */
function MockAgentProfileChatOptimisticNavigationAgentChatWrapper() {
    return <div data-testid="agent-chat-wrapper" />;
}

/**
 * Mocked layout shell that preserves rendered children.
 */
function MockAgentProfileChatOptimisticNavigationAgentChatPageLayout({
    children,
}: {
    children: ReactNode;
}) {
    return <div>{children}</div>;
}

/**
 * Mocked history sidebar surface.
 */
function MockAgentProfileChatOptimisticNavigationAgentChatSidebar() {
    return <div data-testid="agent-chat-sidebar" />;
}

/**
 * Mocked canonical chat panel that exposes the active chat id and rendered messages.
 */
function MockAgentProfileChatOptimisticNavigationCanonicalAgentChatPanel({
    chatId,
    messages,
    autoExecuteMessage,
    autoExecuteMessageAttachments,
    onAutoExecuteMessagePending,
    onSubmitUserTurn,
}: {
    chatId: string;
    messages: ReadonlyArray<{
        id?: string;
        sender: string;
        content: string;
        lifecycleState?: string;
        lifecycleError?: string;
    }>;
    autoExecuteMessage?: string;
    autoExecuteMessageAttachments?: Array<unknown>;
    onAutoExecuteMessagePending?: (payload: {
        chatId: string;
        clientMessageId: string;
        message: string;
        attachments?: Array<unknown>;
    }) => void;
    onSubmitUserTurn?: (payload: {
        message: string;
        attachments?: Array<unknown>;
        clientMessageId?: string;
    }) => Promise<void>;
}) {
    const lastPayloadRef = useRef<string | null>(null);

    useLayoutEffect(() => {
        const nextPayload = JSON.stringify({
            autoExecuteMessage: autoExecuteMessage ?? null,
            autoExecuteMessageAttachments: autoExecuteMessageAttachments ?? [],
        });
        if (nextPayload === lastPayloadRef.current) {
            return;
        }

        lastPayloadRef.current = nextPayload;

        if (autoExecuteMessage === undefined && !autoExecuteMessageAttachments?.length) {
            return;
        }

        const clientMessageId = `auto:${chatId}`;
        onAutoExecuteMessagePending?.({
            chatId,
            clientMessageId,
            message: autoExecuteMessage ?? '',
            attachments: autoExecuteMessageAttachments,
        });
        void onSubmitUserTurn?.({
            message: autoExecuteMessage ?? '',
            attachments: autoExecuteMessageAttachments,
            clientMessageId,
        });
    }, [autoExecuteMessage, autoExecuteMessageAttachments, chatId, onAutoExecuteMessagePending, onSubmitUserTurn]);

    return (
        <div data-testid="canonical-agent-chat-panel">
            <div data-testid="active-chat-id">{chatId}</div>
            {messages.map((message) => (
                <div
                    key={message.id || `${message.sender}-${message.content}-${message.lifecycleState || 'none'}`}
                    data-testid="rendered-message"
                >
                    {`${message.sender}:${message.content}:${message.lifecycleState || 'none'}:${message.lifecycleError || ''}`}
                </div>
            ))}
        </div>
    );
}

/**
 * Shared mock components used by the optimistic-navigation test support facade.
 *
 * @private function of `AgentProfileChat.optimisticNavigation.test.tsx`
 */
export const AgentProfileChatOptimisticNavigationTestComponents = {
    Chat: MockAgentProfileChatOptimisticNavigationChat,
    AgentChatLoadingSkeleton: MockAgentProfileChatOptimisticNavigationAgentChatLoadingSkeleton,
    ChatThreadLoadingSkeleton: MockAgentProfileChatOptimisticNavigationChatThreadLoadingSkeleton,
    AgentChatWrapper: MockAgentProfileChatOptimisticNavigationAgentChatWrapper,
    AgentChatPageLayout: MockAgentProfileChatOptimisticNavigationAgentChatPageLayout,
    AgentChatSidebar: MockAgentProfileChatOptimisticNavigationAgentChatSidebar,
    CanonicalAgentChatPanel: MockAgentProfileChatOptimisticNavigationCanonicalAgentChatPanel,
};
