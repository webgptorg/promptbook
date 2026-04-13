import { expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type { ChatMessage } from '@promptbook-local/types';
import type { ComponentType } from 'react';
import { USER_CHAT_SOURCES } from '../../../utils/userChat/UserChatSource';
import type { UserChatDetail, UserChatsSnapshot } from '../../../utils/userChatClient';
import type { AgentProfileChatProps } from './AgentProfileChat';
import { AgentProfileChatOptimisticNavigationTestComponents } from './AgentProfileChatOptimisticNavigationTestComponents';
import { clearPendingOutboundMessages } from './chat/usePendingOutboundMessages';
import type { AgentChatHistoryClientProps } from './chat/useAgentChatHistoryClientState';

/**
 * Stable identity formatter reused by the mocked naming provider.
 */
const formatTextMock = jest.fn(String);

/**
 * Stable identity translator reused by the mocked server-language provider.
 */
const translateMock = jest.fn(String);

/**
 * Stable router push spy exposed for navigation assertions.
 */
const routerPushMock = jest.fn();

/**
 * Stable router prefetch spy used by the harness setup.
 */
const routerPrefetchMock = jest.fn();

/**
 * Mocked Next.js router hook used by the profile chat component.
 */
const mockedUseRouter = jest.fn();

/**
 * Mocked remote-agent connector used by the profile chat component.
 */
const mockedRemoteAgentConnect = jest.fn();

/**
 * Mocked durable chat bootstrap loader used by the history client.
 */
const mockedFetchUserChats = jest.fn();

/**
 * Mocked durable chat creator used by the history client.
 */
const mockedCreateUserChat = jest.fn();

/**
 * Mocked client-message id generator used by optimistic submissions.
 */
const mockedCreateUserChatClientMessageId = jest.fn();

/**
 * Mocked user-message sender kept pending during optimistic rendering checks.
 */
const mockedSendUserChatMessage = jest.fn();

/**
 * Spy used to silence debug-only logging during the optimistic-navigation tests.
 */
let consoleDebugSpy: jest.SpiedFunction<typeof console.debug>;

jest.doMock('@common/hooks/usePromise', () => ({
    usePromise: () => ({
        value: {
            initialMessage: 'Hello from the agent.',
            isVoiceTtsSttEnabled: false,
            meta: {},
        },
    }),
}));

jest.doMock('@promptbook-local/core', () => ({
    RemoteAgent: {
        connect: mockedRemoteAgentConnect,
    },
}));

jest.doMock('@promptbook-local/components', () => ({
    Chat: AgentProfileChatOptimisticNavigationTestComponents.Chat,
}));

jest.doMock('next/navigation', () => ({
    useRouter: mockedUseRouter,
}));

jest.doMock('../../../components/AgentNaming/AgentNamingContext', () => ({
    useAgentNaming: () => ({
        formatText: formatTextMock,
    }),
}));

jest.doMock('../../../components/AsyncDialogs/asyncDialogs', () => ({
    showAlert: jest.fn(),
    showConfirm: jest.fn(),
}));

jest.doMock('../../../components/ChatEnterBehavior/ChatEnterBehaviorPreferencesProvider', () => ({
    useChatEnterBehaviorPreferences: () => ({
        enterBehavior: 'SEND',
        resolveEnterBehavior: jest.fn(),
    }),
}));

jest.doMock('../../../components/ChatVisualMode/ChatVisualModeProvider', () => ({
    useChatVisualMode: () => ({
        chatVisualMode: 'FULL',
    }),
}));

jest.doMock('../../../components/Header/createMyChatsMobileMenuItem', () => ({
    createMyChatsMobileMenuItem: jest.fn(() => ({})),
}));

jest.doMock('../../../components/Header/MobileMenuHoistingContext', () => ({
    useHoistedMobileMenuItems: jest.fn(),
}));

jest.doMock('../../../components/NavigationProgress/navigationProgressEvents', () => ({
    dispatchNavigationProgressStart: jest.fn(),
}));

jest.doMock('../../../components/Notifications/notifications', () => ({
    notifyError: jest.fn(),
    notifyInfo: jest.fn(),
}));

jest.doMock('../../../components/PrivateModePreferences/PrivateModePreferencesProvider', () => ({
    usePrivateModePreferences: () => ({
        isPrivateModeEnabled: false,
        setIsPrivateModeEnabled: jest.fn(),
    }),
}));

jest.doMock('../../../components/PushNotifications/BrowserPushNotificationsProvider', () => ({
    useBrowserPushNotifications: () => ({
        maybePromptAfterUserMessageGesture: jest.fn(),
        rememberDefaultOffHintShown: jest.fn(async () => false),
        setFocusedChat: jest.fn(),
        setNotificationsEnabled: jest.fn(),
    }),
}));

jest.doMock('../../../components/ServerLanguage/ServerLanguageProvider', () => ({
    useServerLanguage: () => ({
        language: 'en',
        t: translateMock,
    }),
}));

jest.doMock('../../../components/Skeleton/AgentChatLoadingSkeleton', () => ({
    AgentChatLoadingSkeleton: AgentProfileChatOptimisticNavigationTestComponents.AgentChatLoadingSkeleton,
}));

jest.doMock('../../../components/Skeleton/ChatThreadLoadingSkeleton', () => ({
    ChatThreadLoadingSkeleton: AgentProfileChatOptimisticNavigationTestComponents.ChatThreadLoadingSkeleton,
}));

jest.doMock('../../../hooks/useActiveBrowserTab', () => ({
    useActiveBrowserTab: () => false,
}));

jest.doMock('../../../utils/chat/executeQuickActionButton', () => ({
    executeQuickActionButton: jest.fn(),
}));

jest.doMock('../../../utils/shareTargetClient', () => ({
    consumeShareTargetPayloadFromBrowser: jest.fn(async () => undefined),
}));

jest.doMock('../../../utils/upload/createBookEditorUploadHandler', () => ({
    chatFileUploadHandler: jest.fn(),
}));

jest.doMock('../../../app/actions', () => ({
    $createAgentFromBookAction: jest.fn(),
}));

jest.doMock('../../../utils/userChatClient', () => ({
    cancelUserChatJob: jest.fn(),
    cancelUserChatTimeout: jest.fn(),
    createUserChat: mockedCreateUserChat,
    createUserChatClientMessageId: mockedCreateUserChatClientMessageId,
    fetchUserChats: mockedFetchUserChats,
    removeUserChat: jest.fn(),
    saveUserChatDraft: jest.fn(),
    sendUserChatMessage: mockedSendUserChatMessage,
    streamUserChat: jest.fn(),
}));

jest.doMock('./AgentChatWrapper', () => ({
    AgentChatWrapper: AgentProfileChatOptimisticNavigationTestComponents.AgentChatWrapper,
}));

jest.doMock('./chat/AgentChatPageLayout', () => ({
    AgentChatPageLayout: AgentProfileChatOptimisticNavigationTestComponents.AgentChatPageLayout,
}));

jest.doMock('./chat/AgentChatSidebar', () => ({
    AgentChatSidebar: AgentProfileChatOptimisticNavigationTestComponents.AgentChatSidebar,
}));

jest.doMock('./chat/useChatDocumentTitle', () => ({
    useChatDocumentTitle: jest.fn(),
}));

jest.doMock('./chat/CanonicalAgentChatPanel', () => ({
    CanonicalAgentChatPanel: AgentProfileChatOptimisticNavigationTestComponents.CanonicalAgentChatPanel,
}));

/**
 * Stable agent metadata reused across the optimistic-navigation test harness.
 */
const TEST_AGENT_PROFILE = {
    name: 'test-agent',
    title: 'Test Agent',
    url: '/agents/test-agent',
    inputPlaceholder: 'Ask anything',
    brandColorHex: '#111111',
    avatarSrc: '/avatar.png',
} as const;

/**
 * Destination expected after the profile page starts a brand-new chat.
 */
const TEST_NEW_CHAT_DESTINATION = `${TEST_AGENT_PROFILE.url}/chat?chat=new`;

/**
 * Deferred promise contract used to keep bootstrap requests pending inside tests.
 */
type Deferred<TValue> = {
    promise: Promise<TValue>;
    resolve: (value: TValue | PromiseLike<TValue>) => void;
    reject: (reason?: unknown) => void;
};

/**
 * Forever-pending send promise that keeps the optimistic bubble visible during assertions.
 */
const pendingSendUserChatMessagePromise = new Promise<never>(() => {
    /* keep pending so the optimistic bubble is the only rendered user message */
});

/**
 * Creates one deferred promise whose resolution is controlled by the test.
 */
function createDeferred<TValue>(): Deferred<TValue> {
    let resolve!: (value: TValue | PromiseLike<TValue>) => void;
    let reject!: (reason?: unknown) => void;

    const promise = new Promise<TValue>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });

    return { promise, resolve, reject };
}

/**
 * Creates an empty user-chat snapshot for predictable bootstrap flows.
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
 * Creates one durable chat detail payload for mocked new-chat creation.
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
 * Clears the optimistic outbound-message store for all chat ids touched by these tests.
 */
function clearOptimisticNavigationChatState(): void {
    clearPendingOutboundMessages('chat-existing');
    clearPendingOutboundMessages('chat-created');
    clearPendingOutboundMessages('optimistic-user-chat:client-message-1');
    clearPendingOutboundMessages('optimistic-user-chat:client-message-2');
}

/**
 * Applies the stable mock state required before each optimistic-navigation scenario.
 */
function setupAgentProfileChatOptimisticNavigationTest(): void {
    jest.clearAllMocks();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => undefined);

    mockedUseRouter.mockReturnValue({
        push: routerPushMock,
        prefetch: routerPrefetchMock,
    });

    mockedFetchUserChats.mockReset();
    mockedCreateUserChat.mockReset();
    mockedCreateUserChat.mockReturnValue(Promise.resolve(createChatDetail('chat-created')));

    let clientMessageCounter = 0;
    mockedCreateUserChatClientMessageId.mockReset();
    mockedCreateUserChatClientMessageId.mockImplementation(() => `client-message-${++clientMessageCounter}`);

    mockedSendUserChatMessage.mockReset();
    mockedSendUserChatMessage.mockReturnValue(pendingSendUserChatMessagePromise);

    window.sessionStorage.clear();
    clearOptimisticNavigationChatState();
}

/**
 * Restores transient spies created during the optimistic-navigation test setup.
 */
function teardownAgentProfileChatOptimisticNavigationTest(): void {
    consoleDebugSpy.mockRestore();
}

/**
 * Prepares the pending bootstrap sequence used when the profile page starts a new chat.
 */
function preparePendingNewChatBootstrap(): Deferred<UserChatsSnapshot> {
    const bootstrapSnapshot = createDeferred<UserChatsSnapshot>();

    mockedFetchUserChats
        .mockReturnValueOnce(Promise.resolve(createEmptySnapshot()))
        .mockReturnValueOnce(bootstrapSnapshot.promise);

    return bootstrapSnapshot;
}

/**
 * Prepares the pending bootstrap request used when the chat page targets an existing chat.
 */
function preparePendingExistingChatBootstrap(): Deferred<UserChatsSnapshot> {
    const bootstrapSnapshot = createDeferred<UserChatsSnapshot>();
    mockedFetchUserChats.mockReturnValueOnce(bootstrapSnapshot.promise);
    return bootstrapSnapshot;
}

/**
 * Renders the profile-page chat preview with the stable props used by these tests.
 */
function renderProfileChat(AgentProfileChatComponent: ComponentType<AgentProfileChatProps>) {
    return render(
        <AgentProfileChatComponent
            agentUrl={TEST_AGENT_PROFILE.url}
            agentName={TEST_AGENT_PROFILE.name}
            fullname={TEST_AGENT_PROFILE.title}
            inputPlaceholder={TEST_AGENT_PROFILE.inputPlaceholder}
            brandColorHex={TEST_AGENT_PROFILE.brandColorHex}
            avatarSrc={TEST_AGENT_PROFILE.avatarSrc}
            isHistoryEnabled={true}
        />,
    );
}

/**
 * Renders the durable history client with stable defaults for optimistic-navigation tests.
 */
function renderHistoryClient(
    AgentChatHistoryClientComponent: ComponentType<AgentChatHistoryClientProps>,
    overrides: Partial<AgentChatHistoryClientProps> = {},
) {
    return render(
        <AgentChatHistoryClientComponent
            agentName={TEST_AGENT_PROFILE.name}
            agentTitle={TEST_AGENT_PROFILE.title}
            agentUrl={TEST_AGENT_PROFILE.url}
            inputPlaceholder={TEST_AGENT_PROFILE.inputPlaceholder}
            isHistoryEnabled={true}
            isCurrentUserAdmin={false}
            areFileAttachmentsEnabled={true}
            feedbackMode="off"
            {...overrides}
        />,
    );
}

/**
 * Waits until the mocked canonical chat panel renders one queued optimistic user message.
 */
async function expectQueuedUserMessage(message: string): Promise<void> {
    expect(await screen.findByText(`USER:${message}:queued:`)).not.toBeNull();
}

/**
 * Waits until the mocked canonical chat panel exposes the targeted active chat id.
 */
async function expectActiveChatId(chatId: string): Promise<void> {
    expect((await screen.findByTestId('active-chat-id')).textContent).toBe(chatId);
}

/**
 * Shared mock/setup and render facade for `AgentProfileChat.optimisticNavigation.test.tsx`.
 *
 * @private function of `AgentProfileChat.optimisticNavigation.test.tsx`
 */
export const AgentProfileChatOptimisticNavigationTestSupport = {
    routerPushMock,
    newChatDestination: TEST_NEW_CHAT_DESTINATION,
    setup: setupAgentProfileChatOptimisticNavigationTest,
    teardown: teardownAgentProfileChatOptimisticNavigationTest,
    preparePendingNewChatBootstrap,
    preparePendingExistingChatBootstrap,
    renderProfileChat,
    renderHistoryClient,
    expectQueuedUserMessage,
    expectActiveChatId,
};
