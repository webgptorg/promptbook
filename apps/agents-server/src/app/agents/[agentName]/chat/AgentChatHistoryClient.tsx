'use client';

import type { ChatMessage } from '@promptbook-local/types';
import { MessageSquarePlusIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAgentNaming } from '../../../../components/AgentNaming/AgentNamingContext';
import { showConfirm } from '../../../../components/AsyncDialogs/asyncDialogs';
import { createMyChatsMobileMenuItem } from '../../../../components/Header/createMyChatsMobileMenuItem';
import { useHoistedMobileMenuItems } from '../../../../components/Header/MobileMenuHoistingContext';
import { notifyError, notifyInfo } from '../../../../components/Notifications/notifications';
import { usePrivateModePreferences } from '../../../../components/PrivateModePreferences/PrivateModePreferencesProvider';
import { useBrowserPushNotifications } from '../../../../components/PushNotifications/BrowserPushNotificationsProvider';
import { useServerLanguage } from '../../../../components/ServerLanguage/ServerLanguageProvider';
import { AgentChatLoadingSkeleton } from '../../../../components/Skeleton/AgentChatLoadingSkeleton';
import { ChatThreadLoadingSkeleton } from '../../../../components/Skeleton/ChatThreadLoadingSkeleton';
import { useActiveBrowserTab } from '../../../../hooks/useActiveBrowserTab';
import type { ServerLanguageCode } from '../../../../languages/ServerLanguageRegistry';
import type { ChatFeedbackMode } from '../../../../utils/chatFeedbackMode';
import { createServerLanguageMoment } from '../../../../utils/localization/createServerLanguageMoment';
import { consumeShareTargetPayloadFromBrowser } from '../../../../utils/shareTargetClient';
import { USER_CHAT_SOURCES } from '../../../../utils/userChat/UserChatSource';
import {
    cancelUserChatJob,
    cancelUserChatTimeout,
    createUserChat,
    createUserChatClientMessageId,
    fetchUserChats,
    removeUserChat,
    saveUserChatDraft,
    sendUserChatMessage,
    streamUserChat,
    type UserChatDetail,
    type UserChatEnqueueResult,
    type UserChatJob,
    type UserChatSummary,
    type UserChatTimeout,
} from '../../../../utils/userChatClient';
import { AgentChatWrapper } from '../AgentChatWrapper';
import { takePendingProfileMessage } from '../profileMessageCache';
import type { AgentChatLayoutVariant } from './AgentChatLayoutVariant';
import { AgentChatPageLayout } from './AgentChatPageLayout';
import { AgentChatSidebar } from './AgentChatSidebar';
import { CanonicalAgentChatPanel } from './CanonicalAgentChatPanel';
import { mergeCanonicalChatMessagesWithPendingOutboundMessages } from './mergeCanonicalChatMessagesWithPendingOutboundMessages';
import { useChatDocumentTitle } from './useChatDocumentTitle';
import {
    clearPendingOutboundMessages,
    markPendingOutboundMessageFailed,
    queuePendingOutboundMessage,
    reassignPendingOutboundMessagesChatId,
    reconcilePendingOutboundMessages,
    usePendingOutboundMessages,
} from './usePendingOutboundMessages';

/**
 * Reconnect delay after one canonical chat-stream disconnect.
 */
const USER_CHAT_STREAM_RECONNECT_DELAY_MS = 1_500;

/**
 * Background refresh cadence used when the live stream is temporarily disconnected.
 */
const DISCONNECTED_CHAT_REFRESH_INTERVAL_MS = 4_000;

/**
 * Periodic sidebar/list refresh cadence while the active chat stream is healthy.
 */
const CHAT_LIST_REFRESH_INTERVAL_MS = 20_000;

/**
 * Debounce window for draft persistence.
 */
const SAVE_DEBOUNCE_MS = 600;

/**
 * Prefix used for temporary optimistic chat identifiers before the server returns a durable id.
 */
const OPTIMISTIC_CHAT_ID_PREFIX = 'optimistic-user-chat';

/**
 * Props for the full chat page with per-user durable history.
 */
type AgentChatHistoryClientProps = {
    agentName: string;
    agentTitle: string;
    agentUrl: string;
    brandColor?: string;
    inputPlaceholder: string | undefined;
    thinkingMessages?: ReadonlyArray<string>;
    speechRecognitionLanguage?: string;
    initialChatId?: string;
    initialAutoExecuteMessage?: string;
    initialAutoExecuteMessageAttachments?: ChatMessage['attachments'];
    initialShareTargetId?: string;
    initialForceNewChat?: boolean;
    initialAgentMessage?: string | null;
    isHistoryEnabled: boolean;
    isCurrentUserAdmin: boolean;
    areFileAttachmentsEnabled: boolean;
    feedbackMode: ChatFeedbackMode;
    isHeadlessMode?: boolean;
    chatRouteBasePath?: string;
    layoutVariant?: AgentChatLayoutVariant;
};

/**
 * One explicit chat-selection intent issued by the user-facing chat history UI.
 */
type ChatSelectionIntent = {
    /**
     * Monotonic sequence that allows stale async completions to be ignored.
     */
    sequence: number;
    /**
     * Human-readable kind used in dev-only instrumentation.
     */
    kind: 'BOOTSTRAP' | 'OPEN_CHAT' | 'NEW_CHAT' | 'DELETE_CHAT';
    /**
     * Optional chat id targeted by the intent.
     */
    targetChatId: string | null;
};

/**
 * One failed send record keyed by message signature for a single chat.
 */
type FailedSendRecord = {
    /**
     * Stable signature of the outbound payload.
     */
    signature: string;

    /**
     * Client idempotency key associated with the failed send.
     */
    clientMessageId: string;
};

/**
 * One deferred promise handle used to bridge optimistic chat state with a later
 * durable server result.
 */
type Deferred<TValue> = {
    /**
     * Promise resolved or rejected once the deferred work finishes.
     */
    promise: Promise<TValue>;

    /**
     * Resolves the deferred promise.
     */
    resolve: (value: TValue | PromiseLike<TValue>) => void;

    /**
     * Rejects the deferred promise.
     */
    reject: (reason?: unknown) => void;
};

/**
 * One optimistic bootstrapping chat created before the durable chat exists.
 */
type InitialOptimisticChatBootstrap = {
    /**
     * Local optimistic chat id shown immediately after navigation.
     */
    optimisticChatId: string;

    /**
     * Timestamp reused for the placeholder sidebar row.
     */
    createdAt: string;

    /**
     * Deferred durable chat creation awaited by the first outbound turn.
     */
    createChatDeferred: Deferred<UserChatDetail>;
};

/**
 * Replaces browser URL without triggering App Router navigation.
 */
function replaceBrowserUrlWithoutNavigation(nextRelativeUrl: string): void {
    if (typeof window === 'undefined') {
        return;
    }

    const currentRelativeUrl = `${window.location.pathname}${window.location.search}`;
    if (currentRelativeUrl === nextRelativeUrl) {
        return;
    }

    window.history.replaceState(window.history.state, '', nextRelativeUrl);
}

/**
 * Full chat page client with canonical server-owned conversation state.
 */
export function AgentChatHistoryClient(props: AgentChatHistoryClientProps) {
    const {
        agentName,
        agentTitle,
        agentUrl,
        brandColor,
        inputPlaceholder,
        thinkingMessages,
        speechRecognitionLanguage,
        initialChatId,
        initialAutoExecuteMessage,
        initialAutoExecuteMessageAttachments,
        initialShareTargetId,
        initialForceNewChat = false,
        initialAgentMessage,
        isHistoryEnabled,
        isCurrentUserAdmin,
        areFileAttachmentsEnabled,
        feedbackMode,
        isHeadlessMode = false,
        chatRouteBasePath,
        layoutVariant = 'default',
    } = props;
    const isChatGptLikeLayout = layoutVariant === 'chatgptLike';
    const { formatText } = useAgentNaming();
    const { isPrivateModeEnabled } = usePrivateModePreferences();
    const { language, t } = useServerLanguage();
    const { maybePromptAfterUserMessageGesture, rememberDefaultOffHintShown, setFocusedChat, setNotificationsEnabled } =
        useBrowserPushNotifications();
    const isActiveBrowserTab = useActiveBrowserTab();
    const shouldUseHistory = isHistoryEnabled && !isPrivateModeEnabled;
    const resolvedChatRouteBasePath = chatRouteBasePath || `/agents/${encodeURIComponent(agentName)}/chat`;
    const newChatHref = `${resolvedChatRouteBasePath}?chat=new`;
    const pendingProfileMessage = useMemo(() => takePendingProfileMessage(agentName), [agentName]);
    const effectiveInitialAutoExecuteMessage = initialAutoExecuteMessage ?? pendingProfileMessage?.message;
    const effectiveInitialAutoExecuteMessageAttachments =
        initialAutoExecuteMessageAttachments ?? pendingProfileMessage?.attachments;
    const hasInitialAutoExecutePayload = hasAutoExecutePayload(
        effectiveInitialAutoExecuteMessage,
        effectiveInitialAutoExecuteMessageAttachments,
    );
    const shouldSeedInitialOptimisticChat =
        shouldUseHistory && hasInitialAutoExecutePayload && (initialForceNewChat || !initialChatId);
    const initialOptimisticChatBootstrapRef = useRef<InitialOptimisticChatBootstrap | null>(null);
    if (initialOptimisticChatBootstrapRef.current === null && shouldSeedInitialOptimisticChat) {
        initialOptimisticChatBootstrapRef.current = {
            optimisticChatId: createOptimisticChatId(),
            createdAt: new Date().toISOString(),
            createChatDeferred: createDeferred<UserChatDetail>(),
        };
    }
    const initialOptimisticChatBootstrap = initialOptimisticChatBootstrapRef.current;
    const initialSelectedChatId =
        shouldUseHistory && hasInitialAutoExecutePayload
            ? initialOptimisticChatBootstrap?.optimisticChatId || initialChatId || null
            : null;
    const [chats, setChats] = useState<Array<UserChatSummary>>(() =>
        initialOptimisticChatBootstrap
            ? [
                  createOptimisticUserChatSummary(
                      initialOptimisticChatBootstrap.optimisticChatId,
                      initialOptimisticChatBootstrap.createdAt,
                  ),
              ]
            : [],
    );
    const [activeChatId, setActiveChatId] = useState<string | null>(initialSelectedChatId);
    const [activeMessages, setActiveMessages] = useState<Array<ChatMessage>>([]);
    const [activeJobs, setActiveJobs] = useState<Array<UserChatJob>>([]);
    const [activeTimeouts, setActiveTimeouts] = useState<Array<UserChatTimeout>>([]);
    const [activeChatDraftMessage, setActiveChatDraftMessage] = useState('');
    const [, setIsBootstrapping] = useState(shouldUseHistory);
    const [isChatListLoading, setIsChatListLoading] = useState(shouldUseHistory);
    const [isActiveChatLoading, setIsActiveChatLoading] = useState(false);
    const [isActiveChatStreamConnected, setIsActiveChatStreamConnected] = useState(false);
    const [isCreatingChat, setIsCreatingChat] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    const [showExternalChats, setShowExternalChats] = useState(false);
    const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());
    const [pendingNotificationHintAssistantMessageIds, setPendingNotificationHintAssistantMessageIds] = useState<
        Array<string>
    >([]);
    const hasInitialAutoMessageBeenConsumedRef = useRef(false);
    const autoExecuteTargetChatIdRef = useRef<string | undefined>(initialForceNewChat ? undefined : initialChatId);
    const shareTargetIdRef = useRef<string | undefined>(initialShareTargetId);
    const activeChatIdRef = useRef<string | null>(initialSelectedChatId);
    const activeChatDraftMessageRef = useRef('');
    const activeDraftDirtyRef = useRef(false);
    const isActiveDraftUserOwnedRef = useRef(false);
    const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isRefreshingRef = useRef(false);
    const failedSendByChatIdRef = useRef<Map<string, Map<string, string>>>(new Map());
    const pendingOptimisticChatCreationsRef = useRef<Map<string, Promise<UserChatDetail>>>(
        initialOptimisticChatBootstrap
            ? new Map([
                  [
                      initialOptimisticChatBootstrap.optimisticChatId,
                      initialOptimisticChatBootstrap.createChatDeferred.promise,
                  ],
              ])
            : new Map(),
    );
    const resolvedOptimisticChatIdsRef = useRef<Map<string, string>>(new Map());
    const submitUserTurnQueueRef = useRef<Promise<void>>(Promise.resolve());
    const selectionIntentRef = useRef<ChatSelectionIntent>({
        sequence: 0,
        kind: 'BOOTSTRAP',
        targetChatId: initialOptimisticChatBootstrap?.optimisticChatId || (initialForceNewChat ? null : initialChatId || null),
    });

    /**
     * Resolves a failed-send record by chat id and outbound payload signature.
     */
    const resolveFailedSendRecord = useCallback((chatId: string, signature: string): FailedSendRecord | null => {
        const chatFailures = failedSendByChatIdRef.current.get(chatId);
        if (!chatFailures) {
            return null;
        }

        const clientMessageId = chatFailures.get(signature);
        if (!clientMessageId) {
            return null;
        }

        return {
            signature,
            clientMessageId,
        };
    }, []);

    /**
     * Stores one failed-send record for the given chat and message signature.
     */
    const rememberFailedSendRecord = useCallback((chatId: string, record: FailedSendRecord): void => {
        const chatFailures = failedSendByChatIdRef.current.get(chatId) || new Map<string, string>();
        chatFailures.set(record.signature, record.clientMessageId);
        failedSendByChatIdRef.current.set(chatId, chatFailures);
    }, []);

    /**
     * Removes one failed-send record for the provided chat and message signature.
     */
    const clearFailedSendRecord = useCallback((chatId: string, signature: string): void => {
        const chatFailures = failedSendByChatIdRef.current.get(chatId);
        if (!chatFailures) {
            return;
        }

        chatFailures.delete(signature);
        if (chatFailures.size === 0) {
            failedSendByChatIdRef.current.delete(chatId);
        }
    }, []);

    /**
     * Removes all failed-send records for one chat id.
     */
    const clearFailedSendRecordsForChat = useCallback((chatId: string): void => {
        failedSendByChatIdRef.current.delete(chatId);
    }, []);

    /**
     * Reassigns failed-send records from one chat id to another.
     */
    const reassignFailedSendRecordsToChatId = useCallback((fromChatId: string, toChatId: string): void => {
        if (fromChatId === toChatId) {
            return;
        }

        const sourceFailures = failedSendByChatIdRef.current.get(fromChatId);
        if (!sourceFailures || sourceFailures.size === 0) {
            return;
        }

        const targetFailures = failedSendByChatIdRef.current.get(toChatId) || new Map<string, string>();
        for (const [signature, clientMessageId] of sourceFailures) {
            if (!targetFailures.has(signature)) {
                targetFailures.set(signature, clientMessageId);
            }
        }

        failedSendByChatIdRef.current.delete(fromChatId);
        failedSendByChatIdRef.current.set(toChatId, targetFailures);
    }, []);

    /**
     * Resolves the initial optimistic chat bootstrap once the durable chat exists.
     */
    const resolveInitialOptimisticChatBootstrap = useCallback(
        (createdChat: UserChatDetail): void => {
            const initialOptimisticChatBootstrap = initialOptimisticChatBootstrapRef.current;
            if (!initialOptimisticChatBootstrap) {
                return;
            }

            if (!pendingOptimisticChatCreationsRef.current.has(initialOptimisticChatBootstrap.optimisticChatId)) {
                return;
            }

            initialOptimisticChatBootstrap.createChatDeferred.resolve(createdChat);
            pendingOptimisticChatCreationsRef.current.delete(initialOptimisticChatBootstrap.optimisticChatId);
            resolvedOptimisticChatIdsRef.current.set(initialOptimisticChatBootstrap.optimisticChatId, createdChat.chat.id);
            reassignPendingOutboundMessagesChatId({
                fromChatId: initialOptimisticChatBootstrap.optimisticChatId,
                toChatId: createdChat.chat.id,
            });
            reassignFailedSendRecordsToChatId(initialOptimisticChatBootstrap.optimisticChatId, createdChat.chat.id);
        },
        [reassignFailedSendRecordsToChatId],
    );

    /**
     * Rejects the initial optimistic chat bootstrap when background creation fails.
     */
    const rejectInitialOptimisticChatBootstrap = useCallback((error: unknown): void => {
        const initialOptimisticChatBootstrap = initialOptimisticChatBootstrapRef.current;
        if (!initialOptimisticChatBootstrap) {
            return;
        }

        if (!pendingOptimisticChatCreationsRef.current.has(initialOptimisticChatBootstrap.optimisticChatId)) {
            return;
        }

        initialOptimisticChatBootstrap.createChatDeferred.reject(error);
    }, []);

    /**
     * Resolves the durable chat id that should be used for server requests.
     */
    const resolveDurableChatId = useCallback(async (chatId: string): Promise<string> => {
        if (!isOptimisticChatId(chatId)) {
            return chatId;
        }

        const resolvedChatId = resolvedOptimisticChatIdsRef.current.get(chatId);
        if (resolvedChatId) {
            return resolvedChatId;
        }

        const pendingCreation = pendingOptimisticChatCreationsRef.current.get(chatId);
        if (!pendingCreation) {
            throw new Error('Chat is still being created. Please try again.');
        }

        const createdChat = await pendingCreation;
        resolvedOptimisticChatIdsRef.current.set(chatId, createdChat.chat.id);
        return createdChat.chat.id;
    }, []);

    /**
     * Returns true when the active selection already refers to the same canonical
     * chat, even if the browser still renders an optimistic placeholder id.
     */
    const isEquivalentSelectedChat = useCallback((selectedChatId: string | null, resolvedChatId: string): boolean => {
        if (selectedChatId === resolvedChatId) {
            return true;
        }

        if (!selectedChatId || !isOptimisticChatId(selectedChatId)) {
            return false;
        }

        return resolvedOptimisticChatIdsRef.current.get(selectedChatId) === resolvedChatId;
    }, []);

    useEffect(() => {
        activeChatDraftMessageRef.current = activeChatDraftMessage;
    }, [activeChatDraftMessage]);

    useEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }

        /**
         * Marks the active draft as user-owned when the main chat composer receives direct interaction.
         */
        const markDraftAsUserOwned = (event: Event): void => {
            const target = event.target;
            if (!(target instanceof HTMLTextAreaElement)) {
                return;
            }

            if (!target.classList.contains('chat-input-textarea')) {
                return;
            }

            isActiveDraftUserOwnedRef.current = true;
        };

        document.addEventListener('keydown', markDraftAsUserOwned, true);
        document.addEventListener('input', markDraftAsUserOwned, true);
        document.addEventListener('select', markDraftAsUserOwned, true);

        return () => {
            document.removeEventListener('keydown', markDraftAsUserOwned, true);
            document.removeEventListener('input', markDraftAsUserOwned, true);
            document.removeEventListener('select', markDraftAsUserOwned, true);
        };
    }, []);

    useEffect(() => {
        if (!activeChatId) {
            return;
        }

        reconcilePendingOutboundMessages(activeChatId, activeMessages);
    }, [activeChatId, activeMessages]);

    /**
     * Emits one dev-only instrumentation event for chat-selection debugging.
     */
    const logChatSelection = useCallback(
        (event: string, payload: Record<string, unknown> = {}) => {
            if (process.env.NODE_ENV === 'production') {
                return;
            }

            console.debug('[agents-server:user-chat]', {
                agentName,
                event,
                activeChatId: activeChatIdRef.current,
                ...payload,
            });
        },
        [agentName],
    );

    const toggleSidebarCollapsed = useCallback(() => {
        setIsSidebarCollapsed((value) => !value);
    }, []);
    const closeMobileSidebar = useCallback(() => undefined, []);
    const effectiveIsSidebarCollapsed = isChatGptLikeLayout ? false : isSidebarCollapsed;
    const shouldShowExternalChats = isCurrentUserAdmin && showExternalChats;
    const isActiveChatOptimistic = Boolean(activeChatId && isOptimisticChatId(activeChatId));
    const activeChatSummary = useMemo(
        () => chats.find((chat) => chat.id === activeChatId) || null,
        [activeChatId, chats],
    );
    const untitledChatTitle = formatText('New chat');
    useChatDocumentTitle({
        agentTitle,
        activeChatTitle: activeChatSummary?.title,
        untitledChatTitle,
    });
    const pendingOutboundMessages = usePendingOutboundMessages(activeChatId);
    const isActiveChatReadOnly = activeChatSummary?.isReadOnly === true;
    const hasAnyActiveTimeouts = useMemo(
        () => chats.some((chat) => chat.timeoutActivity.count > 0) || activeTimeouts.length > 0,
        [activeTimeouts.length, chats],
    );
    const renderedActiveMessages = useMemo(
        () =>
            mergeCanonicalChatMessagesWithPendingOutboundMessages({
                canonicalMessages: activeMessages,
                pendingOutboundMessages,
            }),
        [activeMessages, pendingOutboundMessages],
    );

    useEffect(() => {
        if (
            !shouldUseHistory ||
            !activeChatId ||
            isActiveChatReadOnly ||
            isActiveChatOptimistic ||
            !isActiveBrowserTab
        ) {
            setFocusedChat(null);
            return;
        }

        setFocusedChat({
            agentPermanentId: agentName,
            chatId: activeChatId,
            isChatFocused: true,
        });
    }, [
        activeChatId,
        agentName,
        isActiveBrowserTab,
        isActiveChatOptimistic,
        isActiveChatReadOnly,
        setFocusedChat,
        shouldUseHistory,
    ]);

    useEffect(() => {
        if (pendingNotificationHintAssistantMessageIds.length === 0) {
            return;
        }

        const hasCompletedTrackedAssistantMessage = pendingNotificationHintAssistantMessageIds.some(
            (assistantMessageId) =>
                activeMessages.some(
                    (message) =>
                        message.id === assistantMessageId && message.sender !== 'USER' && message.isComplete !== false,
                ),
        );
        if (!hasCompletedTrackedAssistantMessage) {
            return;
        }

        let isDisposed = false;
        setPendingNotificationHintAssistantMessageIds([]);
        void rememberDefaultOffHintShown()
            .then((shouldShowHint) => {
                if (!shouldShowHint || isDisposed) {
                    return;
                }

                notifyInfo(t('controlPanel.notificationsHint'), {
                    actionLabel: t('controlPanel.notificationsHintAction'),
                    onAction: () => {
                        void setNotificationsEnabled(true);
                    },
                });
            })
            .catch(() => undefined);

        return () => {
            isDisposed = true;
        };
    }, [
        activeMessages,
        pendingNotificationHintAssistantMessageIds,
        rememberDefaultOffHintShown,
        setNotificationsEnabled,
        t,
    ]);

    /**
     * Loads one canonical snapshot using the current external-chat filter.
     */
    const fetchChatSnapshot = useCallback(
        (chatId?: string) =>
            fetchUserChats(agentName, chatId, {
                showExternalChats: shouldShowExternalChats,
            }),
        [agentName, shouldShowExternalChats],
    );

    /**
     * Builds canonical route for one selected chat.
     */
    const buildChatRoute = useCallback(
        (chatId: string, includeInitialMessage: boolean = false) => {
            const params = new URLSearchParams();
            params.set('chat', chatId);

            if (includeInitialMessage && effectiveInitialAutoExecuteMessage) {
                params.set('message', effectiveInitialAutoExecuteMessage);
            }
            if (includeInitialMessage && shareTargetIdRef.current) {
                params.set('shareTarget', shareTargetIdRef.current);
            }

            if (isHeadlessMode) {
                params.set('headless', '');
            }

            return `${resolvedChatRouteBasePath}?${params.toString()}`;
        },
        [effectiveInitialAutoExecuteMessage, isHeadlessMode, resolvedChatRouteBasePath],
    );

    /**
     * Records one explicit selection intent so older async completions can be discarded.
     */
    const issueSelectionIntent = useCallback(
        (kind: ChatSelectionIntent['kind'], targetChatId: string | null = null): number => {
            const nextSequence = selectionIntentRef.current.sequence + 1;
            selectionIntentRef.current = {
                sequence: nextSequence,
                kind,
                targetChatId,
            };

            logChatSelection('selection_intent', {
                sequence: nextSequence,
                kind,
                targetChatId,
            });

            return nextSequence;
        },
        [logChatSelection],
    );

    /**
     * Returns true when the provided intent sequence still matches the latest explicit intent.
     */
    const isSelectionIntentCurrent = useCallback(
        (sequence: number): boolean => selectionIntentRef.current.sequence === sequence,
        [],
    );

    /**
     * Replaces the browser URL for the active chat while logging route mutations in development.
     */
    const replaceActiveChatRoute = useCallback(
        (chatId: string, options: { includeInitialMessage?: boolean; reason: string }) => {
            if (typeof window === 'undefined') {
                return;
            }

            const nextRelativeUrl = buildChatRoute(chatId, Boolean(options.includeInitialMessage));
            const currentRelativeUrl = `${window.location.pathname}${window.location.search}`;

            if (currentRelativeUrl !== nextRelativeUrl) {
                logChatSelection('route_change', {
                    reason: options.reason,
                    from: currentRelativeUrl,
                    to: nextRelativeUrl,
                    chatId,
                });
            }

            replaceBrowserUrlWithoutNavigation(nextRelativeUrl);
        },
        [buildChatRoute, logChatSelection],
    );

    /**
     * Synchronizes the locally selected chat id immediately so stale streams cannot re-activate an older chat.
     */
    const syncActiveChatSelection = useCallback(
        (
            chatId: string | null,
            options: {
                clearChatContent?: boolean;
                includeInitialMessage?: boolean;
                reason: string;
            },
        ) => {
            activeChatIdRef.current = chatId;
            setActiveChatId(chatId);

            if (options.clearChatContent === true || chatId === null) {
                setActiveMessages([]);
                setActiveJobs([]);
                setActiveTimeouts([]);
                setActiveChatDraftMessage('');
                activeDraftDirtyRef.current = false;
                isActiveDraftUserOwnedRef.current = false;
            }

            if (chatId) {
                replaceActiveChatRoute(chatId, {
                    includeInitialMessage: options.includeInitialMessage,
                    reason: options.reason,
                });
            }

            logChatSelection('selection_sync', {
                reason: options.reason,
                chatId,
                clearChatContent: options.clearChatContent === true,
            });
        },
        [logChatSelection, replaceActiveChatRoute],
    );

    /**
     * Applies one canonical chat detail payload to local state.
     */
    const applyChatDetail = useCallback(
        (
            chatDetail: UserChatDetail | UserChatEnqueueResult,
            options: {
                allowSelectionAdoption?: boolean;
                expectedChatId?: string;
                intentSequence?: number;
                preserveDirtyDraft?: boolean;
                includeInitialMessage?: boolean;
                reason?: string;
            } = {},
        ): boolean => {
            const reason = options.reason || 'detail-update';

            if (options.intentSequence !== undefined && !isSelectionIntentCurrent(options.intentSequence)) {
                logChatSelection('selection_skip_detail_stale_intent', {
                    reason,
                    expectedChatId: options.expectedChatId || null,
                    resolvedChatId: chatDetail.chat.id,
                    intentSequence: options.intentSequence,
                    currentIntentSequence: selectionIntentRef.current.sequence,
                });
                return false;
            }

            if (options.expectedChatId && chatDetail.chat.id !== options.expectedChatId) {
                logChatSelection('selection_skip_detail_chat_mismatch', {
                    reason,
                    expectedChatId: options.expectedChatId,
                    resolvedChatId: chatDetail.chat.id,
                });
                return false;
            }

            const currentSelectedChatId = activeChatIdRef.current;
            if (
                options.allowSelectionAdoption !== true &&
                !isEquivalentSelectedChat(currentSelectedChatId, chatDetail.chat.id)
            ) {
                logChatSelection('selection_skip_detail_selection_mismatch', {
                    reason,
                    expectedChatId: currentSelectedChatId,
                    resolvedChatId: chatDetail.chat.id,
                });
                setChats((previousChats) => replaceChatInList(previousChats, chatDetail.chat));
                return false;
            }

            setChats((previousChats) => replaceChatInList(previousChats, chatDetail.chat));
            syncActiveChatSelection(chatDetail.chat.id, {
                includeInitialMessage: options.includeInitialMessage,
                reason,
            });
            setActiveMessages([...chatDetail.messages]);
            setActiveJobs([...chatDetail.activeJobs]);
            setActiveTimeouts([...chatDetail.activeTimeouts]);

            const shouldPreserveUserOwnedDraft =
                options.preserveDirtyDraft === true &&
                isActiveDraftUserOwnedRef.current &&
                isEquivalentSelectedChat(currentSelectedChatId, chatDetail.chat.id);

            if (!shouldPreserveUserOwnedDraft) {
                const nextDraftMessage = chatDetail.draftMessage || '';
                activeDraftDirtyRef.current = false;
                isActiveDraftUserOwnedRef.current = false;
                setActiveChatDraftMessage(nextDraftMessage);
            }

            setIsActiveChatLoading(false);

            logChatSelection('selection_apply_detail', {
                reason,
                chatId: chatDetail.chat.id,
            });

            return true;
        },
        [isEquivalentSelectedChat, isSelectionIntentCurrent, logChatSelection, syncActiveChatSelection],
    );

    /**
     * Applies one list snapshot to the currently selected chat.
     */
    const applySnapshot = useCallback(
        (
            snapshot: Awaited<ReturnType<typeof fetchUserChats>>,
            options: {
                allowSelectionAdoption?: boolean;
                expectedChatId?: string;
                intentSequence?: number;
                preserveDirtyDraft?: boolean;
                includeInitialMessage?: boolean;
                reason?: string;
            } = {},
        ): boolean => {
            const reason = options.reason || 'snapshot-update';
            setChats(snapshot.chats);
            if (!snapshot.activeChatId) {
                if (options.allowSelectionAdoption !== true) {
                    logChatSelection('selection_skip_snapshot_missing_active_chat', {
                        reason,
                        expectedChatId: options.expectedChatId || activeChatIdRef.current,
                    });
                    return false;
                }

                syncActiveChatSelection(null, {
                    clearChatContent: true,
                    reason,
                });
                setIsActiveChatLoading(false);
                return true;
            }

            if (options.intentSequence !== undefined && !isSelectionIntentCurrent(options.intentSequence)) {
                logChatSelection('selection_skip_snapshot_stale_intent', {
                    reason,
                    expectedChatId: options.expectedChatId || snapshot.activeChatId,
                    resolvedChatId: snapshot.activeChatId,
                    intentSequence: options.intentSequence,
                    currentIntentSequence: selectionIntentRef.current.sequence,
                });
                return false;
            }

            if (options.expectedChatId && snapshot.activeChatId !== options.expectedChatId) {
                logChatSelection('selection_skip_snapshot_chat_mismatch', {
                    reason,
                    expectedChatId: options.expectedChatId,
                    resolvedChatId: snapshot.activeChatId,
                });
                return false;
            }

            const currentSelectedChatId = activeChatIdRef.current;
            if (
                options.allowSelectionAdoption !== true &&
                !isEquivalentSelectedChat(currentSelectedChatId, snapshot.activeChatId)
            ) {
                logChatSelection('selection_skip_snapshot_selection_mismatch', {
                    reason,
                    expectedChatId: currentSelectedChatId,
                    resolvedChatId: snapshot.activeChatId,
                });
                return false;
            }

            syncActiveChatSelection(snapshot.activeChatId, {
                includeInitialMessage: options.includeInitialMessage,
                reason,
            });
            setActiveMessages([...snapshot.activeMessages]);
            setActiveJobs([...snapshot.activeJobs]);
            setActiveTimeouts([...snapshot.activeTimeouts]);

            const shouldPreserveUserOwnedDraft =
                options.preserveDirtyDraft === true &&
                isActiveDraftUserOwnedRef.current &&
                isEquivalentSelectedChat(currentSelectedChatId, snapshot.activeChatId);

            if (!shouldPreserveUserOwnedDraft) {
                const nextDraftMessage = snapshot.activeDraftMessage || '';
                activeDraftDirtyRef.current = false;
                isActiveDraftUserOwnedRef.current = false;
                setActiveChatDraftMessage(nextDraftMessage);
            }

            setIsActiveChatLoading(false);

            logChatSelection('selection_apply_snapshot', {
                reason,
                chatId: snapshot.activeChatId,
            });

            return true;
        },
        [isEquivalentSelectedChat, isSelectionIntentCurrent, logChatSelection, syncActiveChatSelection],
    );

    /**
     * Persists the current active draft immediately.
     */
    const flushActiveDraft = useCallback(
        async (options: { keepalive?: boolean } = {}): Promise<void> => {
            const currentActiveChatId = activeChatIdRef.current;
            if (
                !shouldUseHistory ||
                !currentActiveChatId ||
                isOptimisticChatId(currentActiveChatId) ||
                !activeDraftDirtyRef.current
            ) {
                return;
            }

            const draftValue = activeChatDraftMessageRef.current || null;
            if (draftSaveTimerRef.current) {
                clearTimeout(draftSaveTimerRef.current);
                draftSaveTimerRef.current = null;
            }

            await saveUserChatDraft(agentName, currentActiveChatId, draftValue, {
                keepalive: options.keepalive,
            });
            activeDraftDirtyRef.current = false;
        },
        [agentName, shouldUseHistory],
    );

    /**
     * Bootstraps chats and guarantees an active chat when history is enabled.
     */
    const bootstrapChats = useCallback(
        async (preferredChatId?: string) => {
            const effectivePreferredChatId = initialForceNewChat ? undefined : preferredChatId;
            const intentSequence = issueSelectionIntent('BOOTSTRAP', effectivePreferredChatId || null);
            logChatSelection('bootstrap_start', {
                preferredChatId: effectivePreferredChatId || null,
                intentSequence,
            });
            const snapshot = await fetchChatSnapshot(effectivePreferredChatId);
            const shouldCreateFreshChatForInitialMessage =
                hasInitialAutoExecutePayload &&
                (Boolean(initialOptimisticChatBootstrapRef.current) || !hasInitialAutoMessageBeenConsumedRef.current) &&
                (initialForceNewChat || !effectivePreferredChatId);

            if (!snapshot.activeChatId || shouldCreateFreshChatForInitialMessage) {
                const createdChat = await createUserChat(agentName);
                resolveInitialOptimisticChatBootstrap(createdChat);
                if (hasInitialAutoExecutePayload) {
                    autoExecuteTargetChatIdRef.current = createdChat.chat.id;
                }

                applyChatDetail(createdChat, {
                    allowSelectionAdoption: true,
                    includeInitialMessage:
                        !hasInitialAutoMessageBeenConsumedRef.current && hasInitialAutoExecutePayload,
                    intentSequence,
                    reason: 'bootstrap_create_chat',
                });
                const initialOptimisticChatBootstrap = initialOptimisticChatBootstrapRef.current;
                setChats(
                    initialOptimisticChatBootstrap
                        ? replaceOptimisticChatWithCanonicalChat(
                              snapshot.chats,
                              initialOptimisticChatBootstrap.optimisticChatId,
                              createdChat.chat,
                          )
                        : [createdChat.chat, ...snapshot.chats.filter((chat) => chat.id !== createdChat.chat.id)],
                );
                return;
            }

            const shouldKeepInitialAutoMessage =
                !hasInitialAutoMessageBeenConsumedRef.current &&
                hasInitialAutoExecutePayload &&
                (!autoExecuteTargetChatIdRef.current || autoExecuteTargetChatIdRef.current === snapshot.activeChatId);

            applySnapshot(snapshot, {
                allowSelectionAdoption: true,
                expectedChatId: effectivePreferredChatId,
                includeInitialMessage: shouldKeepInitialAutoMessage,
                intentSequence,
                reason: 'bootstrap_snapshot',
            });
        },
        [
            agentName,
            applyChatDetail,
            applySnapshot,
            fetchChatSnapshot,
            hasInitialAutoExecutePayload,
            initialForceNewChat,
            issueSelectionIntent,
            logChatSelection,
            resolveInitialOptimisticChatBootstrap,
        ],
    );

    /**
     * Refreshes the canonical state of the currently selected chat.
     */
    const refreshActiveChat = useCallback(
        async (options: { preserveDirtyDraft?: boolean } = { preserveDirtyDraft: true }) => {
            const currentActiveChatId = activeChatIdRef.current;
            if (
                !shouldUseHistory ||
                !currentActiveChatId ||
                isOptimisticChatId(currentActiveChatId) ||
                isRefreshingRef.current
            ) {
                return;
            }

            isRefreshingRef.current = true;
            try {
                const snapshot = await fetchChatSnapshot(currentActiveChatId);
                if (!snapshot.activeChatId) {
                    logChatSelection('refresh_missing_active_chat', {
                        chatId: currentActiveChatId,
                    });
                    await bootstrapChats(undefined);
                    return;
                }

                applySnapshot(snapshot, {
                    expectedChatId: currentActiveChatId,
                    preserveDirtyDraft: options.preserveDirtyDraft,
                    reason: 'refresh_active_chat',
                });
            } finally {
                isRefreshingRef.current = false;
            }
        },
        [applySnapshot, bootstrapChats, fetchChatSnapshot, logChatSelection, shouldUseHistory],
    );

    useEffect(() => {
        if (!shouldUseHistory) {
            setChats([]);
            syncActiveChatSelection(null, {
                clearChatContent: true,
                reason: 'history_disabled',
            });
            failedSendByChatIdRef.current.clear();
            pendingOptimisticChatCreationsRef.current.clear();
            resolvedOptimisticChatIdsRef.current.clear();
            setIsActiveChatStreamConnected(false);
            setIsBootstrapping(false);
            setIsChatListLoading(false);
            setIsActiveChatLoading(false);
            return;
        }

        let isDisposed = false;

        async function bootstrap(): Promise<void> {
            setIsBootstrapping(true);
            setIsChatListLoading(true);

            try {
                await bootstrapChats(initialChatId);
            } catch (error) {
                rejectInitialOptimisticChatBootstrap(error);
                if (!isDisposed) {
                    notifyError(resolveErrorMessage(error, 'Failed to load chats.'));
                }
            } finally {
                if (!isDisposed) {
                    setIsBootstrapping(false);
                    setIsChatListLoading(false);
                }
            }
        }

        void bootstrap();

        return () => {
            isDisposed = true;
        };
    }, [bootstrapChats, initialChatId, rejectInitialOptimisticChatBootstrap, shouldUseHistory, syncActiveChatSelection]);

    useEffect(() => {
        autoExecuteTargetChatIdRef.current = initialForceNewChat ? undefined : initialChatId;
    }, [initialChatId, initialForceNewChat]);

    useEffect(() => {
        shareTargetIdRef.current = initialShareTargetId;
    }, [initialShareTargetId]);

    useEffect(() => {
        if (!hasAnyActiveTimeouts) {
            return;
        }

        const interval = window.setInterval(() => {
            setCurrentTimestamp(Date.now());
        }, 1_000);

        return () => {
            window.clearInterval(interval);
        };
    }, [hasAnyActiveTimeouts]);

    useEffect(() => {
        if (!shouldUseHistory || typeof window === 'undefined') {
            return;
        }

        const flushWithKeepalive = () => {
            void flushActiveDraft({ keepalive: true });
        };

        window.addEventListener('pagehide', flushWithKeepalive);
        window.addEventListener('beforeunload', flushWithKeepalive);

        return () => {
            window.removeEventListener('pagehide', flushWithKeepalive);
            window.removeEventListener('beforeunload', flushWithKeepalive);
            void flushActiveDraft();
        };
    }, [flushActiveDraft, shouldUseHistory]);

    useEffect(() => {
        if (
            !shouldUseHistory ||
            !activeChatId ||
            isActiveChatReadOnly ||
            isActiveChatOptimistic ||
            !isActiveBrowserTab
        ) {
            setIsActiveChatStreamConnected(false);
            return;
        }

        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        let isDisposed = false;
        const abortController = new AbortController();

        /**
         * Opens the canonical chat stream and keeps reconnecting while the current chat stays selected.
         */
        const connectStream = async (): Promise<void> => {
            setIsActiveChatStreamConnected(false);

            try {
                await streamUserChat(agentName, activeChatId, {
                    signal: abortController.signal,
                    onSnapshot: (chatDetail) => {
                        if (activeChatIdRef.current !== activeChatId) {
                            return;
                        }

                        setIsActiveChatStreamConnected(true);
                        applyChatDetail(chatDetail, {
                            expectedChatId: activeChatId,
                            preserveDirtyDraft: true,
                            reason: 'stream_snapshot',
                        });
                    },
                });
            } catch (error) {
                if (abortController.signal.aborted || isDisposed) {
                    return;
                }

                console.error('[user-chat] Failed to keep canonical chat stream open', {
                    agentName,
                    chatId: activeChatId,
                    error,
                });

                setIsActiveChatStreamConnected(false);
                void refreshActiveChat({ preserveDirtyDraft: true }).catch(() => undefined);
            }

            if (abortController.signal.aborted || isDisposed) {
                return;
            }

            reconnectTimer = setTimeout(() => {
                void connectStream();
            }, USER_CHAT_STREAM_RECONNECT_DELAY_MS);
        };

        void connectStream();

        return () => {
            isDisposed = true;
            setIsActiveChatStreamConnected(false);

            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
            }

            abortController.abort();
        };
    }, [
        activeChatId,
        agentName,
        applyChatDetail,
        isActiveBrowserTab,
        isActiveChatOptimistic,
        isActiveChatReadOnly,
        refreshActiveChat,
        shouldUseHistory,
    ]);

    useEffect(() => {
        if (!shouldUseHistory || !activeChatId || isActiveChatReadOnly || isActiveChatOptimistic) {
            return;
        }

        const pollIntervalMs = isActiveChatStreamConnected
            ? CHAT_LIST_REFRESH_INTERVAL_MS
            : DISCONNECTED_CHAT_REFRESH_INTERVAL_MS;
        const runRefresh = () => {
            if (typeof document !== 'undefined' && document.hidden) {
                return;
            }

            void refreshActiveChat({ preserveDirtyDraft: true });
        };

        const interval = window.setInterval(runRefresh, pollIntervalMs);
        const handleVisibilityChange = () => {
            if (typeof document !== 'undefined' && !document.hidden) {
                runRefresh();
            }
        };
        const handleFocus = () => {
            runRefresh();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [
        activeChatId,
        isActiveChatOptimistic,
        isActiveChatReadOnly,
        isActiveChatStreamConnected,
        refreshActiveChat,
        shouldUseHistory,
    ]);

    /**
     * Selects one existing chat.
     */
    const handleSelectChat = useCallback(
        async (chatId: string) => {
            if (chatId === activeChatIdRef.current && !isActiveChatLoading) {
                return;
            }

            const intentSequence = issueSelectionIntent('OPEN_CHAT', chatId);
            logChatSelection('open_chat_click', {
                chatId,
                intentSequence,
            });
            await flushActiveDraft();
            if (!isSelectionIntentCurrent(intentSequence)) {
                logChatSelection('open_chat_cancelled_stale_intent', {
                    chatId,
                    intentSequence,
                });
                return;
            }

            setIsActiveChatLoading(true);
            syncActiveChatSelection(chatId, {
                clearChatContent: true,
                reason: 'open_chat_click',
            });
            try {
                const snapshot = await fetchChatSnapshot(chatId);
                applySnapshot(snapshot, {
                    expectedChatId: chatId,
                    intentSequence,
                    reason: 'open_chat_snapshot',
                });
            } catch (error) {
                setIsActiveChatLoading(false);
                notifyError(resolveErrorMessage(error, 'Failed to open chat.'));
            }
        },
        [
            applySnapshot,
            fetchChatSnapshot,
            flushActiveDraft,
            isActiveChatLoading,
            isSelectionIntentCurrent,
            issueSelectionIntent,
            logChatSelection,
            syncActiveChatSelection,
        ],
    );

    const handleSelectChatFromSidebar = useCallback(
        (chatId: string) => {
            void handleSelectChat(chatId);
            closeMobileSidebar();
        },
        [handleSelectChat, closeMobileSidebar],
    );

    /**
     * Toggles admin-only external chat visibility.
     */
    const handleShowExternalChatsChange = useCallback((nextValue: boolean) => {
        setShowExternalChats(nextValue);
    }, []);

    /**
     * Creates a fresh chat and makes it active.
     */
    const handleCreateChat = useCallback(async () => {
        if (isCreatingChat) {
            return;
        }

        const previousActiveChatId = activeChatIdRef.current;
        const optimisticChatId = createOptimisticChatId();
        const optimisticChat = createOptimisticUserChatSummary(optimisticChatId, new Date().toISOString());
        const intentSequence = issueSelectionIntent('NEW_CHAT', optimisticChatId);
        logChatSelection('new_chat_click', {
            intentSequence,
            optimisticChatId,
        });

        const flushDraftPromise = flushActiveDraft().catch(() => undefined);
        setChats((previousChats) => replaceChatInList(previousChats, optimisticChat));
        syncActiveChatSelection(optimisticChatId, {
            clearChatContent: true,
            reason: 'create_chat_optimistic_selection',
        });

        const createChatPromise = (async () => {
            await flushDraftPromise;
            return createUserChat(agentName);
        })();
        pendingOptimisticChatCreationsRef.current.set(optimisticChatId, createChatPromise);
        setIsCreatingChat(true);

        try {
            logChatSelection('create_chat_start', {
                intentSequence,
                optimisticChatId,
            });
            const createdChat = await createChatPromise;
            pendingOptimisticChatCreationsRef.current.delete(optimisticChatId);
            resolvedOptimisticChatIdsRef.current.set(optimisticChatId, createdChat.chat.id);
            reassignPendingOutboundMessagesChatId({
                fromChatId: optimisticChatId,
                toChatId: createdChat.chat.id,
            });
            reassignFailedSendRecordsToChatId(optimisticChatId, createdChat.chat.id);
            setChats((previousChats) =>
                replaceOptimisticChatWithCanonicalChat(previousChats, optimisticChatId, createdChat.chat),
            );

            logChatSelection('create_chat_success', {
                intentSequence,
                optimisticChatId,
                chatId: createdChat.chat.id,
            });
            applyChatDetail(createdChat, {
                allowSelectionAdoption: true,
                intentSequence,
                reason: 'create_chat_success',
            });
        } catch (error) {
            pendingOptimisticChatCreationsRef.current.delete(optimisticChatId);
            resolvedOptimisticChatIdsRef.current.delete(optimisticChatId);
            clearPendingOutboundMessages(optimisticChatId);
            clearFailedSendRecordsForChat(optimisticChatId);
            setChats((previousChats) => previousChats.filter((chat) => chat.id !== optimisticChatId));

            if (activeChatIdRef.current === optimisticChatId) {
                try {
                    setIsActiveChatLoading(true);
                    await bootstrapChats(previousActiveChatId || undefined);
                } catch {
                    setIsActiveChatLoading(false);
                }
            }

            logChatSelection('create_chat_fail', {
                intentSequence,
                optimisticChatId,
                error: error instanceof Error ? error.message : String(error),
            });
            notifyError(resolveErrorMessage(error, 'Failed to create chat.'));
        } finally {
            setIsCreatingChat(false);
        }
    }, [
        agentName,
        applyChatDetail,
        bootstrapChats,
        clearFailedSendRecordsForChat,
        flushActiveDraft,
        isCreatingChat,
        issueSelectionIntent,
        logChatSelection,
        reassignFailedSendRecordsToChatId,
        syncActiveChatSelection,
    ]);

    /**
     * Deletes one chat and refreshes the canonical snapshot.
     */
    const handleDeleteChat = useCallback(
        async (chatId: string) => {
            const confirmed = await showConfirm({
                title: formatText('Delete chat'),
                message: formatText('Do you want to permanently delete this chat?'),
                confirmLabel: formatText('Delete'),
                cancelLabel: formatText('Cancel'),
            }).catch(() => false);

            if (!confirmed) {
                return;
            }

            try {
                setIsChatListLoading(true);
                await removeUserChat(agentName, chatId);
                clearPendingOutboundMessages(chatId);
                clearFailedSendRecordsForChat(chatId);
                pendingOptimisticChatCreationsRef.current.delete(chatId);
                resolvedOptimisticChatIdsRef.current.delete(chatId);
                if (activeChatIdRef.current === chatId) {
                    issueSelectionIntent('DELETE_CHAT', null);
                    setIsActiveChatLoading(true);
                    await bootstrapChats(undefined);
                } else {
                    await refreshActiveChat({ preserveDirtyDraft: true });
                }
            } catch (error) {
                notifyError(resolveErrorMessage(error, 'Failed to delete chat.'));
            } finally {
                setIsChatListLoading(false);
            }
        },
        [agentName, bootstrapChats, clearFailedSendRecordsForChat, formatText, issueSelectionIntent, refreshActiveChat],
    );

    /**
     * Persists draft text after a short debounce.
     */
    const handleDraftMessageChange = useCallback(
        (draftMessage: string) => {
            if (!shouldUseHistory || !activeChatIdRef.current) {
                return;
            }

            setActiveChatDraftMessage(draftMessage);
            activeDraftDirtyRef.current = true;
            isActiveDraftUserOwnedRef.current = true;

            if (draftSaveTimerRef.current) {
                clearTimeout(draftSaveTimerRef.current);
            }

            draftSaveTimerRef.current = setTimeout(() => {
                void flushActiveDraft().catch((error) => {
                    notifyError(resolveErrorMessage(error, 'Failed to save chat draft.'));
                });
            }, SAVE_DEBOUNCE_MS);
        },
        [flushActiveDraft, shouldUseHistory],
    );

    /**
     * Seeds one optimistic outbound user bubble before the durable send request resolves.
     */
    const handleAutoExecuteMessagePending = useCallback(
        (payload: {
            chatId: string;
            clientMessageId: string;
            message: string;
            attachments?: ChatMessage['attachments'];
        }) => {
            queuePendingOutboundMessage({
                chatId: payload.chatId,
                clientMessageId: payload.clientMessageId,
                content: payload.message,
                attachments: payload.attachments,
            });
        },
        [],
    );

    /**
     * Submits one user-authored chat turn for durable server-side execution.
     */
    const handleSubmitUserTurn = useCallback(
        async (payload: {
            message: string;
            attachments?: ChatMessage['attachments'];
            parameters?: Record<string, unknown>;
            clientMessageId?: string;
        }) => {
            const currentActiveChatId = activeChatIdRef.current;
            if (!shouldUseHistory || !currentActiveChatId) {
                throw new Error('No active chat selected.');
            }

            const signature = createChatMessageSignature(payload.message, payload.attachments);
            const failedSendRecord = resolveFailedSendRecord(currentActiveChatId, signature);
            const clientMessageId = payload.clientMessageId
                ? payload.clientMessageId
                : failedSendRecord
                ? failedSendRecord.clientMessageId
                : createUserChatClientMessageId();

            queuePendingOutboundMessage({
                chatId: currentActiveChatId,
                clientMessageId,
                content: payload.message,
                attachments: payload.attachments,
            });

            if (!payload.clientMessageId) {
                maybePromptAfterUserMessageGesture();
            }

            const submitPromise = submitUserTurnQueueRef.current
                .catch(() => undefined)
                .then(async () => {
                    let resolvedChatId = currentActiveChatId;
                    try {
                        resolvedChatId = await resolveDurableChatId(currentActiveChatId);

                        if (resolvedChatId !== currentActiveChatId) {
                            reassignPendingOutboundMessagesChatId({
                                fromChatId: currentActiveChatId,
                                toChatId: resolvedChatId,
                            });
                            reassignFailedSendRecordsToChatId(currentActiveChatId, resolvedChatId);
                        }

                        const result = await sendUserChatMessage(agentName, resolvedChatId, {
                            clientMessageId,
                            message: payload.message,
                            attachments: payload.attachments,
                            parameters: payload.parameters,
                        });

                        clearFailedSendRecord(currentActiveChatId, signature);
                        clearFailedSendRecord(resolvedChatId, signature);
                        activeDraftDirtyRef.current = false;
                        isActiveDraftUserOwnedRef.current = false;
                        setActiveChatDraftMessage('');
                        setPendingNotificationHintAssistantMessageIds((assistantMessageIds) =>
                            assistantMessageIds.includes(result.job.assistantMessageId)
                                ? assistantMessageIds
                                : [...assistantMessageIds, result.job.assistantMessageId],
                        );
                        applyChatDetail(result, {
                            preserveDirtyDraft: false,
                            reason: 'send_user_turn',
                        });
                    } catch (error) {
                        const failedSend: FailedSendRecord = {
                            signature,
                            clientMessageId,
                        };
                        const errorMessage = resolveErrorMessage(error, 'Failed to send chat message.');
                        rememberFailedSendRecord(resolvedChatId, failedSend);
                        if (resolvedChatId !== currentActiveChatId) {
                            rememberFailedSendRecord(currentActiveChatId, failedSend);
                        }

                        markPendingOutboundMessageFailed({
                            chatId: currentActiveChatId,
                            clientMessageId,
                            errorMessage,
                        });
                        if (resolvedChatId !== currentActiveChatId) {
                            markPendingOutboundMessageFailed({
                                chatId: resolvedChatId,
                                clientMessageId,
                                errorMessage,
                            });
                        }

                        throw error;
                    }
                });

            submitUserTurnQueueRef.current = submitPromise.catch(() => undefined);
            await submitPromise;
        },
        [
            agentName,
            applyChatDetail,
            clearFailedSendRecord,
            maybePromptAfterUserMessageGesture,
            reassignFailedSendRecordsToChatId,
            rememberFailedSendRecord,
            resolveDurableChatId,
            resolveFailedSendRecord,
            shouldUseHistory,
        ],
    );

    /**
     * Requests cancellation for one active durable job.
     */
    const handleCancelActiveJob = useCallback(
        async (jobId: string) => {
            const currentActiveChatId = activeChatIdRef.current;
            if (!currentActiveChatId) {
                return;
            }

            const chatDetail = await cancelUserChatJob(agentName, currentActiveChatId, jobId);
            applyChatDetail(chatDetail, {
                expectedChatId: currentActiveChatId,
                preserveDirtyDraft: true,
                reason: 'cancel_active_job',
            });
        },
        [agentName, applyChatDetail],
    );

    /**
     * Requests cancellation for one active durable timeout.
     */
    const handleCancelActiveTimeout = useCallback(
        async (timeoutId: string) => {
            const currentActiveChatId = activeChatIdRef.current;
            if (!currentActiveChatId) {
                return;
            }

            const chatDetail = await cancelUserChatTimeout(agentName, currentActiveChatId, timeoutId);
            applyChatDetail(chatDetail, {
                expectedChatId: currentActiveChatId,
                preserveDirtyDraft: true,
                reason: 'cancel_active_timeout',
            });
        },
        [agentName, applyChatDetail],
    );

    /**
     * Handles in-chat "New chat" action.
     */
    const handleStartNewChatFromChatSurface = useCallback(async () => {
        await handleCreateChat();
    }, [handleCreateChat]);

    /**
     * Marks the initial auto-execute payload as consumed and removes it from the URL.
     */
    const handleAutoExecuteMessageConsumed = useCallback(() => {
        hasInitialAutoMessageBeenConsumedRef.current = true;
        const consumedShareTargetId = shareTargetIdRef.current;
        shareTargetIdRef.current = undefined;

        if (consumedShareTargetId) {
            void consumeShareTargetPayloadFromBrowser(agentName, consumedShareTargetId).catch(() => undefined);
        }

        if (typeof window === 'undefined') {
            return;
        }

        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete('message');
        nextUrl.searchParams.delete('shareTarget');
        window.history.replaceState(window.history.state, '', `${nextUrl.pathname}${nextUrl.search}`);
    }, [agentName]);

    const autoMessageTargetId = autoExecuteTargetChatIdRef.current;
    const shouldAutoExecuteCurrentChat =
        !hasInitialAutoMessageBeenConsumedRef.current &&
        hasInitialAutoExecutePayload &&
        Boolean(activeChatId) &&
        !isActiveChatReadOnly &&
        (!autoMessageTargetId || autoMessageTargetId === activeChatId);
    const autoExecuteMessage =
        shouldAutoExecuteCurrentChat ? effectiveInitialAutoExecuteMessage ?? '' : undefined;
    const hoistedMobileMenuItems = useMemo(
        () =>
            shouldUseHistory && !isHeadlessMode
                ? [
                      createMyChatsMobileMenuItem({
                          formatText,
                          chats,
                          activeChatId,
                          onSelectChat: handleSelectChatFromSidebar,
                          onCreateChat: () => {
                              void handleCreateChat();
                          },
                      }),
                  ]
                : [],
        [
            activeChatId,
            chats,
            formatText,
            handleCreateChat,
            handleSelectChatFromSidebar,
            isHeadlessMode,
            shouldUseHistory,
        ],
    );

    useHoistedMobileMenuItems(hoistedMobileMenuItems);

    const formatChatTimestamp = useCallback(
        (timestamp: string): string => formatRelativeChatTimestamp(timestamp, language),
        [language],
    );

    if (!shouldUseHistory) {
        const guestChatContent = (
            <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
                <PrivateModeHistoryBanner formatText={formatText} />
                <div className="flex min-h-0 flex-1 overflow-hidden">
                    <AgentChatWrapper
                        key={`guest-${agentName}`}
                        agentName={agentName}
                        agentUrl={agentUrl}
                        autoExecuteMessage={effectiveInitialAutoExecuteMessage}
                        autoExecuteMessageAttachments={effectiveInitialAutoExecuteMessageAttachments}
                        brandColor={brandColor}
                        inputPlaceholder={inputPlaceholder}
                        thinkingMessages={thinkingMessages}
                        speechRecognitionLanguage={speechRecognitionLanguage}
                        persistenceKey={`guest-chat-${encodeURIComponent(agentName)}`}
                        areFileAttachmentsEnabled={areFileAttachmentsEnabled}
                        feedbackMode={feedbackMode}
                        onAutoExecuteMessageConsumed={handleAutoExecuteMessageConsumed}
                        layoutVariant={layoutVariant}
                    />
                </div>
            </div>
        );

        if (isChatGptLikeLayout) {
            return (
                <AgentChatPageLayout variant={layoutVariant} isHeadlessMode={isHeadlessMode}>
                    {guestChatContent}
                </AgentChatPageLayout>
            );
        }

        return guestChatContent;
    }

    if (!activeChatId) {
        if (isChatGptLikeLayout) {
            return (
                <AgentChatPageLayout variant={layoutVariant} isHeadlessMode={isHeadlessMode}>
                    <AgentChatLoadingSkeleton showSidebar={!isHeadlessMode} isSidebarCollapsed={false} />
                </AgentChatPageLayout>
            );
        }

        return (
            <AgentChatLoadingSkeleton showSidebar={!isHeadlessMode} isSidebarCollapsed={effectiveIsSidebarCollapsed} />
        );
    }

    const chatSurface = (
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
            {isActiveChatLoading ? (
                <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-white/30 bg-white/70 backdrop-blur-sm">
                    <ChatThreadLoadingSkeleton />
                </div>
            ) : (
                <CanonicalAgentChatPanel
                    chatId={activeChatId}
                    agentName={agentName}
                    agentUrl={agentUrl}
                    brandColor={brandColor}
                    inputPlaceholder={inputPlaceholder}
                    thinkingMessages={thinkingMessages}
                    speechRecognitionLanguage={speechRecognitionLanguage}
                    initialAgentMessage={initialAgentMessage}
                    isReadOnly={isActiveChatReadOnly}
                    readOnlySource={activeChatSummary?.source}
                    messages={renderedActiveMessages}
                    draftMessage={isActiveChatReadOnly ? '' : activeChatDraftMessage}
                    autoExecuteMessage={autoExecuteMessage}
                    autoExecuteMessageAttachments={effectiveInitialAutoExecuteMessageAttachments}
                    areFileAttachmentsEnabled={areFileAttachmentsEnabled}
                    feedbackMode={feedbackMode}
                    activeJobs={activeJobs}
                    activeTimeouts={activeTimeouts}
                    currentTimestamp={currentTimestamp}
                    onDraftMessageChange={handleDraftMessageChange}
                    onSubmitUserTurn={handleSubmitUserTurn}
                    onStartNewChat={isActiveChatReadOnly ? undefined : handleStartNewChatFromChatSurface}
                    onCancelActiveJob={isActiveChatReadOnly ? undefined : handleCancelActiveJob}
                    onCancelActiveTimeout={isActiveChatReadOnly ? undefined : handleCancelActiveTimeout}
                    onAutoExecuteMessagePending={handleAutoExecuteMessagePending}
                    onAutoExecuteMessageConsumed={handleAutoExecuteMessageConsumed}
                    variant={layoutVariant}
                />
            )}
        </div>
    );

    const chatSidebar = (
        <AgentChatSidebar
            chats={chats}
            activeChatId={activeChatId}
            isLoadingChats={isChatListLoading}
            formatText={formatText}
            formatChatTimestamp={formatChatTimestamp}
            currentTimestamp={currentTimestamp}
            onSelectChat={handleSelectChatFromSidebar}
            onDeleteChat={handleDeleteChat}
            newChatHref={newChatHref}
            isAdmin={isCurrentUserAdmin}
            showExternalChats={shouldShowExternalChats}
            onShowExternalChatsChange={handleShowExternalChatsChange}
            isCollapsed={effectiveIsSidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapsed}
            isMobileSidebarOpen={false}
            onCloseMobileSidebar={closeMobileSidebar}
            variant={layoutVariant}
        />
    );
    const chatGptLikeTopBar = (
        <div className="agent-chat-chatgpt-like-mobile-header flex items-center justify-between gap-3 px-3.5 py-2.5 md:hidden">
            <span
                aria-hidden="true"
                className="agent-chat-chatgpt-like-mobile-header__icon-button inline-flex h-9 w-9 items-center justify-center rounded-lg border opacity-0"
            />
            <div className="min-w-0 flex-1 text-center">
                <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {activeChatSummary?.title || untitledChatTitle}
                </div>
                <div className="truncate text-[11px] uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                    {formatText('ChatGPT-like')}
                </div>
            </div>
            <a
                href={newChatHref}
                className="agent-chat-chatgpt-like-mobile-header__icon-button inline-flex h-9 w-9 items-center justify-center rounded-lg border transition"
                aria-label={formatText('New chat')}
            >
                <MessageSquarePlusIcon className="h-4 w-4" />
            </a>
        </div>
    );

    if (!isChatGptLikeLayout) {
        if (isHeadlessMode) {
            return (
                <AgentChatPageLayout variant={layoutVariant} isHeadlessMode>
                    {chatSurface}
                </AgentChatPageLayout>
            );
        }

        return (
            <AgentChatPageLayout variant={layoutVariant} sidebar={chatSidebar}>
                {chatSurface}
            </AgentChatPageLayout>
        );
    }

    return (
        <AgentChatPageLayout
            variant={layoutVariant}
            isHeadlessMode={isHeadlessMode}
            sidebar={isHeadlessMode ? undefined : chatSidebar}
            mainTopBar={isHeadlessMode ? undefined : chatGptLikeTopBar}
        >
            {chatSurface}
        </AgentChatPageLayout>
    );
}

/**
 * Returns true when one initial auto-execute payload contains a message or attachments.
 */
function hasAutoExecutePayload(message: string | undefined, attachments: ChatMessage['attachments'] | undefined): boolean {
    return Boolean(message) || Boolean(attachments?.length);
}

/**
 * Creates one deferred promise handle for optimistic chat bootstrapping.
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
 * Creates one temporary optimistic chat id used before the server returns a durable id.
 */
function createOptimisticChatId(): string {
    return `${OPTIMISTIC_CHAT_ID_PREFIX}:${createUserChatClientMessageId()}`;
}

/**
 * Returns true when the provided chat id is a local optimistic placeholder id.
 */
function isOptimisticChatId(chatId: string): boolean {
    return chatId.startsWith(`${OPTIMISTIC_CHAT_ID_PREFIX}:`);
}

/**
 * Builds one local placeholder chat summary used for optimistic new-chat navigation.
 */
function createOptimisticUserChatSummary(chatId: string, timestamp: string): UserChatSummary {
    return {
        id: chatId,
        createdAt: timestamp,
        updatedAt: timestamp,
        lastMessageAt: null,
        source: USER_CHAT_SOURCES.WEB_UI,
        isReadOnly: false,
        messagesCount: 0,
        title: '',
        preview: '',
        runningActivity: {
            count: 0,
        },
        timeoutActivity: {
            count: 0,
            nearestDueAt: null,
        },
    };
}

/**
 * Replaces one optimistic placeholder chat with the canonical chat returned by the server.
 */
function replaceOptimisticChatWithCanonicalChat(
    chats: ReadonlyArray<UserChatSummary>,
    optimisticChatId: string,
    canonicalChat: UserChatSummary,
): Array<UserChatSummary> {
    const chatsWithoutPlaceholder = chats.filter(
        (chat) => chat.id !== optimisticChatId && chat.id !== canonicalChat.id,
    );

    return replaceChatInList(chatsWithoutPlaceholder, canonicalChat);
}

/**
 * Builds a stable signature for one outbound user-message payload.
 */
function createChatMessageSignature(message: string, attachments?: ChatMessage['attachments']): string {
    return JSON.stringify({
        message,
        attachments: attachments || [],
    });
}

/**
 * Resolves one unknown error to a user-facing message.
 */
function resolveErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
}

/**
 * Moves one chat summary to the top of the sidebar list.
 */
function replaceChatInList(chats: ReadonlyArray<UserChatSummary>, targetChat: UserChatSummary): Array<UserChatSummary> {
    const remainingChats = chats.filter((chat) => chat.id !== targetChat.id);
    return [targetChat, ...remainingChats];
}

/**
 * Formats one chat timestamp into relative text using the active server language.
 */
function formatRelativeChatTimestamp(timestamp: string, language: ServerLanguageCode): string {
    const parsed = createServerLanguageMoment(timestamp, language);
    if (!parsed.isValid()) {
        return timestamp;
    }

    return parsed.fromNow();
}

/**
 * Displays private mode notice when history persistence is disabled.
 */
function PrivateModeHistoryBanner({ formatText }: { formatText: (text: string) => string }) {
    return (
        <div className="border-b border-blue-100 bg-blue-50 px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-blue-700">
            {formatText('Private mode is on. Chat history, memories, and learning are disabled.')}
        </div>
    );
}
