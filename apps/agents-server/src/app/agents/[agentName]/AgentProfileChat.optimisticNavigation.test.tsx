/** @jest-environment jsdom */

jest.mock('@common/hooks/usePromise', () => ({
    usePromise: () => ({
        value: {
            initialMessage: 'Hello from the agent.',
            isVoiceTtsSttEnabled: false,
            meta: {},
        },
    }),
}));

jest.mock('@promptbook-local/core', () => ({
    RemoteAgent: {
        connect: jest.fn(),
    },
}));

jest.mock('@promptbook-local/components', () => {
    const React = jest.requireActual('react') as typeof import('react');

    return {
        Chat: ({ onMessage }: { onMessage?: (message: string) => void }) => (
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
        ),
    };
});

jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

jest.mock('../../../components/AgentNaming/AgentNamingContext', () => ({
    useAgentNaming: () => ({
        formatText: (text: string) => text,
    }),
}));

jest.mock('../../../components/AsyncDialogs/asyncDialogs', () => ({
    showAlert: jest.fn(),
    showConfirm: jest.fn(),
}));

jest.mock('../../../components/ChatEnterBehavior/ChatEnterBehaviorPreferencesProvider', () => ({
    useChatEnterBehaviorPreferences: () => ({
        enterBehavior: 'SEND',
        resolveEnterBehavior: jest.fn(),
    }),
}));

jest.mock('../../../components/ChatVisualMode/ChatVisualModeProvider', () => ({
    useChatVisualMode: () => ({
        chatVisualMode: 'FULL',
    }),
}));

jest.mock('../../../components/Header/createMyChatsMobileMenuItem', () => ({
    createMyChatsMobileMenuItem: jest.fn(() => ({})),
}));

jest.mock('../../../components/Header/MobileMenuHoistingContext', () => ({
    useHoistedMobileMenuItems: jest.fn(),
}));

jest.mock('../../../components/NavigationProgress/navigationProgressEvents', () => ({
    dispatchNavigationProgressStart: jest.fn(),
}));

jest.mock('../../../components/Notifications/notifications', () => ({
    notifyError: jest.fn(),
    notifyInfo: jest.fn(),
}));

jest.mock('../../../components/PrivateModePreferences/PrivateModePreferencesProvider', () => ({
    usePrivateModePreferences: () => ({
        isPrivateModeEnabled: false,
        setIsPrivateModeEnabled: jest.fn(),
    }),
}));

jest.mock('../../../components/PushNotifications/BrowserPushNotificationsProvider', () => ({
    useBrowserPushNotifications: () => ({
        maybePromptAfterUserMessageGesture: jest.fn(),
        rememberDefaultOffHintShown: jest.fn(async () => false),
        setFocusedChat: jest.fn(),
        setNotificationsEnabled: jest.fn(),
    }),
}));

jest.mock('../../../components/ServerLanguage/ServerLanguageProvider', () => ({
    useServerLanguage: () => ({
        language: 'en',
        t: (key: string) => key,
    }),
}));

jest.mock('../../../components/Skeleton/AgentChatLoadingSkeleton', () => ({
    AgentChatLoadingSkeleton: () => <div data-testid="agent-chat-loading-skeleton" />,
}));

jest.mock('../../../components/Skeleton/ChatThreadLoadingSkeleton', () => ({
    ChatThreadLoadingSkeleton: () => <div data-testid="chat-thread-loading-skeleton" />,
}));

jest.mock('../../../hooks/useActiveBrowserTab', () => ({
    useActiveBrowserTab: () => false,
}));

jest.mock('../../../utils/chat/executeQuickActionButton', () => ({
    executeQuickActionButton: jest.fn(),
}));

jest.mock('../../../utils/shareTargetClient', () => ({
    consumeShareTargetPayloadFromBrowser: jest.fn(async () => undefined),
}));

jest.mock('../../../utils/upload/createBookEditorUploadHandler', () => ({
    chatFileUploadHandler: jest.fn(),
}));

jest.mock('../../../app/actions', () => ({
    $createAgentFromBookAction: jest.fn(),
}));

jest.mock('../../../utils/userChatClient', () => {
    const actual = jest.requireActual('../../../utils/userChatClient') as typeof import('../../../utils/userChatClient');

    return {
        ...actual,
        cancelUserChatJob: jest.fn(),
        cancelUserChatTimeout: jest.fn(),
        createUserChat: jest.fn(),
        createUserChatClientMessageId: jest.fn(),
        fetchUserChats: jest.fn(),
        removeUserChat: jest.fn(),
        saveUserChatDraft: jest.fn(),
        sendUserChatMessage: jest.fn(),
        streamUserChat: jest.fn(),
    };
});

jest.mock('./AgentChatWrapper', () => ({
    AgentChatWrapper: () => <div data-testid="agent-chat-wrapper" />,
}));

jest.mock('./chat/AgentChatPageLayout', () => ({
    AgentChatPageLayout: ({ children }: { children: import('react').ReactNode }) => <div>{children}</div>,
}));

jest.mock('./chat/AgentChatSidebar', () => ({
    AgentChatSidebar: () => <div data-testid="agent-chat-sidebar" />,
}));

jest.mock('./chat/useChatDocumentTitle', () => ({
    useChatDocumentTitle: jest.fn(),
}));

jest.mock('./chat/CanonicalAgentChatPanel', () => {
    const React = jest.requireActual('react') as typeof import('react');

    return {
        CanonicalAgentChatPanel: ({
            chatId,
            messages,
            autoExecuteMessage,
            autoExecuteMessageAttachments,
            onAutoExecuteMessagePending,
            onSubmitUserTurn,
        }: {
            chatId: string;
            messages: Array<{
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
        }) => {
            const lastPayloadRef = React.useRef<string | null>(null);

            React.useLayoutEffect(() => {
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
        },
    };
});

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ChatMessage } from '@promptbook-local/types';
import { useRouter } from 'next/navigation';
import type { ComponentProps } from 'react';
import { USER_CHAT_SOURCES } from '../../../utils/userChat/UserChatSource';
import {
    createUserChat,
    createUserChatClientMessageId,
    fetchUserChats,
    sendUserChatMessage,
    type UserChatDetail,
    type UserChatsSnapshot,
} from '../../../utils/userChatClient';
import { AgentProfileChat } from './AgentProfileChat';
import { AgentChatHistoryClient } from './chat/AgentChatHistoryClient';
import { clearPendingOutboundMessages } from './chat/usePendingOutboundMessages';

/**
 * Small deferred promise helper used to keep bootstrap/send requests pending during tests.
 */
function createDeferred<TValue>() {
    let resolve!: (value: TValue | PromiseLike<TValue>) => void;
    let reject!: (reason?: unknown) => void;

    const promise = new Promise<TValue>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });

    return { promise, resolve, reject };
}

/**
 * Builds one empty user-chat snapshot for predictable bootstrap tests.
 */
function createEmptySnapshot(): UserChatsSnapshot {
    return {
        chats: [],
        activeChatId: null,
        activeMessages: [],
        activeDraftMessage: '',
        activeJobs: [],
        activeTimeouts: [],
    };
}

/**
 * Builds one durable chat detail payload for mocked send/create calls.
 */
function createChatDetail(chatId: string, messages: Array<ChatMessage> = []): UserChatDetail {
    return {
        chat: {
            id: chatId,
            createdAt: '2026-04-09T20:00:00.000Z',
            updatedAt: '2026-04-09T20:00:00.000Z',
            lastMessageAt: null,
            source: USER_CHAT_SOURCES.WEB_UI,
            isReadOnly: false,
            messagesCount: messages.length,
            title: '',
            preview: '',
            runningActivity: {
                count: 0,
            },
            timeoutActivity: {
                count: 0,
                nearestDueAt: null,
            },
        },
        messages,
        draftMessage: '',
        activeJobs: [],
        activeTimeouts: [],
    };
}

/**
 * Renders the standalone chat client with stable defaults for optimistic-navigation tests.
 */
function renderHistoryClient(
    overrides: Partial<ComponentProps<typeof AgentChatHistoryClient>> = {},
) {
    return render(
        <AgentChatHistoryClient
            agentName="test-agent"
            agentTitle="Test Agent"
            agentUrl="/agents/test-agent"
            inputPlaceholder="Ask anything"
            isHistoryEnabled={true}
            isCurrentUserAdmin={false}
            areFileAttachmentsEnabled={true}
            feedbackMode="off"
            {...overrides}
        />,
    );
}

describe('Agent profile to chat optimistic handoff', () => {
    const routerPushMock = jest.fn();
    const routerPrefetchMock = jest.fn();
    const mockedUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
    const mockedFetchUserChats = fetchUserChats as jest.MockedFunction<typeof fetchUserChats>;
    const mockedCreateUserChat = createUserChat as jest.MockedFunction<typeof createUserChat>;
    const mockedCreateUserChatClientMessageId = createUserChatClientMessageId as jest.MockedFunction<
        typeof createUserChatClientMessageId
    >;
    const mockedSendUserChatMessage = sendUserChatMessage as jest.MockedFunction<typeof sendUserChatMessage>;
    let consoleDebugSpy: jest.SpiedFunction<typeof console.debug>;

    beforeEach(() => {
        consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => undefined);
        routerPushMock.mockReset();
        routerPrefetchMock.mockReset();
        mockedUseRouter.mockReturnValue({
            push: routerPushMock,
            prefetch: routerPrefetchMock,
        } as unknown as ReturnType<typeof useRouter>);

        mockedFetchUserChats.mockReset();
        mockedCreateUserChat.mockReset();
        mockedCreateUserChat.mockResolvedValue(createChatDetail('chat-created'));

        let clientMessageCounter = 0;
        mockedCreateUserChatClientMessageId.mockReset();
        mockedCreateUserChatClientMessageId.mockImplementation(() => `client-message-${++clientMessageCounter}`);

        mockedSendUserChatMessage.mockReset();
        mockedSendUserChatMessage.mockImplementation(
            () =>
                new Promise(() => {
                    /* keep pending so the optimistic bubble is the only rendered user message */
                }),
        );

        window.sessionStorage.clear();
        clearPendingOutboundMessages('chat-existing');
        clearPendingOutboundMessages('chat-created');
        clearPendingOutboundMessages('optimistic-user-chat:client-message-1');
        clearPendingOutboundMessages('optimistic-user-chat:client-message-2');
    });

    afterEach(() => {
        consoleDebugSpy.mockRestore();
    });

    it('shows the quick-button profile message immediately on the chat page before bootstrap resolves', async () => {
        const bootstrapSnapshot = createDeferred<UserChatsSnapshot>();
        mockedFetchUserChats
            .mockResolvedValueOnce(createEmptySnapshot())
            .mockImplementationOnce(() => bootstrapSnapshot.promise);

        const profileView = render(
            <AgentProfileChat
                agentUrl="/agents/test-agent"
                agentName="test-agent"
                fullname="Test Agent"
                inputPlaceholder="Ask anything"
                brandColorHex="#111111"
                avatarSrc="/avatar.png"
                isHistoryEnabled={true}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Quick hello from profile' }));

        expect(routerPushMock).toHaveBeenCalledWith('/agents/test-agent/chat?chat=new');

        profileView.unmount();

        renderHistoryClient({
            initialForceNewChat: true,
        });

        await waitFor(() => {
            expect(screen.queryByText('USER:Quick hello from profile:queued:')).not.toBeNull();
        });
    });

    it('shows the typed profile message immediately on the chat page before bootstrap resolves', async () => {
        const bootstrapSnapshot = createDeferred<UserChatsSnapshot>();
        mockedFetchUserChats
            .mockResolvedValueOnce(createEmptySnapshot())
            .mockImplementationOnce(() => bootstrapSnapshot.promise);

        const profileView = render(
            <AgentProfileChat
                agentUrl="/agents/test-agent"
                agentName="test-agent"
                fullname="Test Agent"
                inputPlaceholder="Ask anything"
                brandColorHex="#111111"
                avatarSrc="/avatar.png"
                isHistoryEnabled={true}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Typed hello from profile' }));

        expect(routerPushMock).toHaveBeenCalledWith('/agents/test-agent/chat?chat=new');

        profileView.unmount();

        renderHistoryClient({
            initialForceNewChat: true,
        });

        await waitFor(() => {
            expect(screen.queryByText('USER:Typed hello from profile:queued:')).not.toBeNull();
        });
    });

    it('shows query-param auto-executed messages immediately in the targeted existing chat', async () => {
        const bootstrapSnapshot = createDeferred<UserChatsSnapshot>();
        mockedFetchUserChats.mockImplementationOnce(() => bootstrapSnapshot.promise);

        renderHistoryClient({
            initialChatId: 'chat-existing',
            initialAutoExecuteMessage: 'Continue in the existing chat',
        });

        await waitFor(() => {
            expect(screen.getByTestId('active-chat-id').textContent).toBe('chat-existing');
        });
        expect(screen.queryByText('USER:Continue in the existing chat:queued:')).not.toBeNull();
    });
});
