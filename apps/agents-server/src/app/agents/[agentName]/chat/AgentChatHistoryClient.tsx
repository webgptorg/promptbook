'use client';

import type { ChatMessage } from '@promptbook-local/types';
import { MessageSquarePlusIcon } from 'lucide-react';
import moment from 'moment';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MenuIcon } from '../../../../../../../src/book-components/icons/MenuIcon';
import { SolidArrowButton } from '../../../../../../../src/book-components/icons/SolidArrowButton';
import { useAgentNaming } from '../../../../components/AgentNaming/AgentNamingContext';
import { showConfirm } from '../../../../components/AsyncDialogs/asyncDialogs';
import { notifyError, notifyInfo } from '../../../../components/Notifications/notifications';
import { usePrivateModePreferences } from '../../../../components/PrivateModePreferences/PrivateModePreferencesProvider';
import { useBrowserPushNotifications } from '../../../../components/PushNotifications/BrowserPushNotificationsProvider';
import { useServerLanguage } from '../../../../components/ServerLanguage/ServerLanguageProvider';
import { AgentChatLoadingSkeleton } from '../../../../components/Skeleton/AgentChatLoadingSkeleton';
import { ChatThreadLoadingSkeleton } from '../../../../components/Skeleton/ChatThreadLoadingSkeleton';
import { useActiveBrowserTab } from '../../../../hooks/useActiveBrowserTab';
import type { ChatFeedbackMode } from '../../../../utils/chatFeedbackMode';
import { consumeShareTargetPayloadFromBrowser } from '../../../../utils/shareTargetClient';
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
import { AGENT_CHAT_SIDEBAR_ID, AgentChatSidebar } from './AgentChatSidebar';
import { CanonicalAgentChatPanel } from './CanonicalAgentChatPanel';
import { mergeCanonicalChatMessagesWithPendingOutboundMessages } from './mergeCanonicalChatMessagesWithPendingOutboundMessages';
import {
    clearPendingOutboundMessages,
    markPendingOutboundMessageFailed,
    queuePendingOutboundMessage,
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
 * Props for the full chat page with per-user durable history.
 */
type AgentChatHistoryClientProps = {
    agentName: string;
    agentUrl: string;
    brandColor?: string;
    inputPlaceholder: string;
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
    const { t } = useServerLanguage();
    const { maybePromptAfterUserMessageGesture, rememberDefaultOffHintShown, setFocusedChat, setNotificationsEnabled } =
        useBrowserPushNotifications();
    const isActiveBrowserTab = useActiveBrowserTab();
    const shouldUseHistory = isHistoryEnabled && !isPrivateModeEnabled;
    const resolvedChatRouteBasePath = chatRouteBasePath || `/agents/${encodeURIComponent(agentName)}/chat`;
    const pendingProfileMessage = useMemo(() => takePendingProfileMessage(agentName), [agentName]);
    const effectiveInitialAutoExecuteMessage = initialAutoExecuteMessage ?? pendingProfileMessage?.message;
    const effectiveInitialAutoExecuteMessageAttachments =
        initialAutoExecuteMessageAttachments ?? pendingProfileMessage?.attachments;
    const [chats, setChats] = useState<Array<UserChatSummary>>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [activeMessages, setActiveMessages] = useState<Array<ChatMessage>>([]);
    const [activeJobs, setActiveJobs] = useState<Array<UserChatJob>>([]);
    const [activeTimeouts, setActiveTimeouts] = useState<Array<UserChatTimeout>>([]);
    const [activeChatDraftMessage, setActiveChatDraftMessage] = useState('');
    const [isBootstrapping, setIsBootstrapping] = useState(shouldUseHistory);
    const [isChatListLoading, setIsChatListLoading] = useState(shouldUseHistory);
    const [isActiveChatLoading, setIsActiveChatLoading] = useState(false);
    const [isActiveChatStreamConnected, setIsActiveChatStreamConnected] = useState(false);
    const [isCreatingChat, setIsCreatingChat] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [showExternalChats, setShowExternalChats] = useState(false);
    const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());
    const [pendingNotificationHintAssistantMessageIds, setPendingNotificationHintAssistantMessageIds] = useState<
        Array<string>
    >([]);
    const hasInitialAutoMessageBeenConsumedRef = useRef(false);
    const autoExecuteTargetChatIdRef = useRef<string | undefined>(initialForceNewChat ? undefined : initialChatId);
    const shareTargetIdRef = useRef<string | undefined>(initialShareTargetId);
    const activeChatIdRef = useRef<string | null>(null);
    const activeChatDraftMessageRef = useRef('');
    const activeDraftDirtyRef = useRef(false);
    const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isRefreshingRef = useRef(false);
    const failedSendRef = useRef<{ signature: string; clientMessageId: string } | null>(null);
    const selectionIntentRef = useRef<ChatSelectionIntent>({
        sequence: 0,
        kind: 'BOOTSTRAP',
        targetChatId: initialForceNewChat ? null : initialChatId || null,
    });

    useEffect(() => {
        activeChatIdRef.current = activeChatId;
    }, [activeChatId]);

    useEffect(() => {
        activeChatDraftMessageRef.current = activeChatDraftMessage;
    }, [activeChatDraftMessage]);

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
    const openMobileSidebar = useCallback(() => {
        setIsMobileSidebarOpen(true);
    }, []);
    const closeMobileSidebar = useCallback(() => {
        setIsMobileSidebarOpen(false);
    }, []);
    const mobileHandleVisibility = isMobileSidebarOpen
        ? 'opacity-0 pointer-events-none'
        : 'opacity-100 pointer-events-auto';
    const effectiveIsSidebarCollapsed = isChatGptLikeLayout ? false : isMobileSidebarOpen ? false : isSidebarCollapsed;
    const shouldShowExternalChats = isCurrentUserAdmin && showExternalChats;
    const activeChatSummary = useMemo(
        () => chats.find((chat) => chat.id === activeChatId) || null,
        [activeChatId, chats],
    );
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
        if (!shouldUseHistory || !activeChatId || isActiveChatReadOnly || !isActiveBrowserTab) {
            setFocusedChat(null);
            return;
        }

        setFocusedChat({
            agentPermanentId: agentName,
            chatId: activeChatId,
            isChatFocused: true,
        });
    }, [activeChatId, agentName, isActiveBrowserTab, isActiveChatReadOnly, setFocusedChat, shouldUseHistory]);

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
            if (options.allowSelectionAdoption !== true && currentSelectedChatId !== chatDetail.chat.id) {
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

            const shouldPreserveDirtyDraft =
                options.preserveDirtyDraft === true &&
                activeDraftDirtyRef.current &&
                currentSelectedChatId === chatDetail.chat.id;

            if (!shouldPreserveDirtyDraft) {
                const nextDraftMessage = chatDetail.draftMessage || '';
                activeDraftDirtyRef.current = false;
                setActiveChatDraftMessage(nextDraftMessage);
            }

            setIsActiveChatLoading(false);

            logChatSelection('selection_apply_detail', {
                reason,
                chatId: chatDetail.chat.id,
            });

            return true;
        },
        [isSelectionIntentCurrent, logChatSelection, syncActiveChatSelection],
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
            if (options.allowSelectionAdoption !== true && currentSelectedChatId !== snapshot.activeChatId) {
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

            const shouldPreserveDirtyDraft =
                options.preserveDirtyDraft === true &&
                activeDraftDirtyRef.current &&
                currentSelectedChatId === snapshot.activeChatId;

            if (!shouldPreserveDirtyDraft) {
                const nextDraftMessage = snapshot.activeDraftMessage || '';
                activeDraftDirtyRef.current = false;
                setActiveChatDraftMessage(nextDraftMessage);
            }

            setIsActiveChatLoading(false);

            logChatSelection('selection_apply_snapshot', {
                reason,
                chatId: snapshot.activeChatId,
            });

            return true;
        },
        [isSelectionIntentCurrent, logChatSelection, syncActiveChatSelection],
    );

    /**
     * Persists the current active draft immediately.
     */
    const flushActiveDraft = useCallback(
        async (options: { keepalive?: boolean } = {}): Promise<void> => {
            const currentActiveChatId = activeChatIdRef.current;
            if (!shouldUseHistory || !currentActiveChatId || !activeDraftDirtyRef.current) {
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
                !hasInitialAutoMessageBeenConsumedRef.current &&
                Boolean(effectiveInitialAutoExecuteMessage) &&
                (initialForceNewChat || !effectivePreferredChatId);

            if (!snapshot.activeChatId || shouldCreateFreshChatForInitialMessage) {
                const createdChat = await createUserChat(agentName);
                if (effectiveInitialAutoExecuteMessage) {
                    autoExecuteTargetChatIdRef.current = createdChat.chat.id;
                }

                applyChatDetail(createdChat, {
                    allowSelectionAdoption: true,
                    includeInitialMessage: Boolean(effectiveInitialAutoExecuteMessage),
                    intentSequence,
                    reason: 'bootstrap_create_chat',
                });
                setChats([createdChat.chat, ...snapshot.chats.filter((chat) => chat.id !== createdChat.chat.id)]);
                return;
            }

            const shouldKeepInitialAutoMessage =
                !hasInitialAutoMessageBeenConsumedRef.current &&
                Boolean(effectiveInitialAutoExecuteMessage) &&
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
            effectiveInitialAutoExecuteMessage,
            fetchChatSnapshot,
            initialForceNewChat,
            issueSelectionIntent,
            logChatSelection,
        ],
    );

    /**
     * Refreshes the canonical state of the currently selected chat.
     */
    const refreshActiveChat = useCallback(
        async (options: { preserveDirtyDraft?: boolean } = { preserveDirtyDraft: true }) => {
            const currentActiveChatId = activeChatIdRef.current;
            if (!shouldUseHistory || !currentActiveChatId || isRefreshingRef.current) {
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
    }, [bootstrapChats, initialChatId, shouldUseHistory, syncActiveChatSelection]);

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
        if (!shouldUseHistory || !activeChatId || isActiveChatReadOnly || !isActiveBrowserTab) {
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
        isActiveChatReadOnly,
        refreshActiveChat,
        shouldUseHistory,
    ]);

    useEffect(() => {
        if (!shouldUseHistory || !activeChatId || isActiveChatReadOnly) {
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
    }, [activeChatId, isActiveChatReadOnly, isActiveChatStreamConnected, refreshActiveChat, shouldUseHistory]);

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

        const intentSequence = issueSelectionIntent('NEW_CHAT');
        logChatSelection('new_chat_click', {
            intentSequence,
        });
        setIsCreatingChat(true);
        try {
            logChatSelection('create_chat_start', {
                intentSequence,
            });
            await flushActiveDraft();
            if (!isSelectionIntentCurrent(intentSequence)) {
                logChatSelection('create_chat_cancelled_stale_intent', {
                    intentSequence,
                });
                return;
            }

            const createdChat = await createUserChat(agentName);
            logChatSelection('create_chat_success', {
                intentSequence,
                chatId: createdChat.chat.id,
            });
            applyChatDetail(createdChat, {
                allowSelectionAdoption: true,
                intentSequence,
                reason: 'create_chat_success',
            });
        } catch (error) {
            logChatSelection('create_chat_fail', {
                intentSequence,
                error: error instanceof Error ? error.message : String(error),
            });
            notifyError(resolveErrorMessage(error, 'Failed to create chat.'));
        } finally {
            setIsCreatingChat(false);
        }
    }, [
        agentName,
        applyChatDetail,
        flushActiveDraft,
        isCreatingChat,
        isSelectionIntentCurrent,
        issueSelectionIntent,
        logChatSelection,
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
        [agentName, bootstrapChats, formatText, issueSelectionIntent, refreshActiveChat],
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
            const retryingFailedInitialMessage = failedSendRef.current?.signature === signature;
            const clientMessageId = payload.clientMessageId
                ? payload.clientMessageId
                : retryingFailedInitialMessage
                ? failedSendRef.current!.clientMessageId
                : createUserChatClientMessageId();
            const shouldMaintainOptimisticPendingMessage =
                Boolean(payload.clientMessageId) || retryingFailedInitialMessage;

            if (shouldMaintainOptimisticPendingMessage) {
                queuePendingOutboundMessage({
                    chatId: currentActiveChatId,
                    clientMessageId,
                    content: payload.message,
                    attachments: payload.attachments,
                });
            }

            if (!payload.clientMessageId) {
                maybePromptAfterUserMessageGesture();
            }

            try {
                const result = await sendUserChatMessage(agentName, currentActiveChatId, {
                    clientMessageId,
                    message: payload.message,
                    attachments: payload.attachments,
                    parameters: payload.parameters,
                });

                failedSendRef.current = null;
                activeDraftDirtyRef.current = false;
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
                failedSendRef.current = {
                    signature,
                    clientMessageId,
                };
                if (shouldMaintainOptimisticPendingMessage) {
                    markPendingOutboundMessageFailed({
                        chatId: currentActiveChatId,
                        clientMessageId,
                        errorMessage: resolveErrorMessage(error, 'Failed to send chat message.'),
                    });
                }
                throw error;
            }
        },
        [agentName, applyChatDetail, maybePromptAfterUserMessageGesture, shouldUseHistory],
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
    const autoExecuteMessage =
        !hasInitialAutoMessageBeenConsumedRef.current &&
        Boolean(effectiveInitialAutoExecuteMessage) &&
        Boolean(activeChatId) &&
        !isActiveChatReadOnly &&
        (!autoMessageTargetId || autoMessageTargetId === activeChatId)
            ? effectiveInitialAutoExecuteMessage
            : undefined;

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

    if (isBootstrapping || !activeChatId) {
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
            isCreatingChat={isCreatingChat}
            isLoadingChats={isChatListLoading}
            formatText={formatText}
            formatChatTimestamp={formatChatTimestamp}
            currentTimestamp={currentTimestamp}
            onSelectChat={handleSelectChatFromSidebar}
            onCreateChat={handleCreateChat}
            onDeleteChat={handleDeleteChat}
            isAdmin={isCurrentUserAdmin}
            showExternalChats={shouldShowExternalChats}
            onShowExternalChatsChange={handleShowExternalChatsChange}
            isCollapsed={effectiveIsSidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapsed}
            isMobileSidebarOpen={isMobileSidebarOpen}
            onCloseMobileSidebar={closeMobileSidebar}
            variant={layoutVariant}
        />
    );
    const defaultMobileSidebarTrigger = (
        <SolidArrowButton
            direction="right"
            onClick={openMobileSidebar}
            className={`shrink-0 transition-opacity duration-150 ${mobileHandleVisibility}`}
            aria-controls={AGENT_CHAT_SIDEBAR_ID}
            aria-expanded={isMobileSidebarOpen}
            aria-hidden={isMobileSidebarOpen}
            aria-label={formatText('Open chats sidebar')}
        />
    );
    const chatGptLikeTopBar = (
        <div className="agent-chat-chatgpt-like-mobile-header flex items-center justify-between gap-3 px-3.5 py-2.5 md:hidden">
            <button
                type="button"
                onClick={openMobileSidebar}
                className="agent-chat-chatgpt-like-mobile-header__icon-button inline-flex h-9 w-9 items-center justify-center rounded-lg border transition"
                aria-controls={AGENT_CHAT_SIDEBAR_ID}
                aria-expanded={isMobileSidebarOpen}
                aria-label={formatText('Open chats sidebar')}
            >
                <MenuIcon size={18} />
            </button>
            <div className="min-w-0 flex-1 text-center">
                <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {activeChatSummary?.title || formatText('New chat')}
                </div>
                <div className="truncate text-[11px] uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                    {formatText('ChatGPT-like')}
                </div>
            </div>
            <button
                type="button"
                onClick={() => {
                    void handleCreateChat();
                }}
                disabled={isCreatingChat}
                className="agent-chat-chatgpt-like-mobile-header__icon-button inline-flex h-9 w-9 items-center justify-center rounded-lg border transition disabled:cursor-default disabled:opacity-60"
                aria-label={formatText('New chat')}
            >
                <MessageSquarePlusIcon className="h-4 w-4" />
            </button>
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
            <AgentChatPageLayout
                variant={layoutVariant}
                sidebar={chatSidebar}
                mobileSidebarTrigger={defaultMobileSidebarTrigger}
            >
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
 * Formats timestamp into a relative localized string.
 */
function formatChatTimestamp(timestamp: string): string {
    const parsed = moment(timestamp);
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
