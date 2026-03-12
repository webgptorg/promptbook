'use client';

import type { ChatMessage } from '@promptbook-local/types';
import moment from 'moment';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAgentNaming } from '../../../../components/AgentNaming/AgentNamingContext';
import { showConfirm } from '../../../../components/AsyncDialogs/asyncDialogs';
import { notifyError } from '../../../../components/Notifications/notifications';
import { usePrivateModePreferences } from '../../../../components/PrivateModePreferences/PrivateModePreferencesProvider';
import { AgentChatLoadingSkeleton } from '../../../../components/Skeleton/AgentChatLoadingSkeleton';
import { SolidArrowButton } from '../../../../../../../src/book-components/icons/SolidArrowButton';
import {
    cancelUserChatJob,
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
} from '../../../../utils/userChatClient';
import { AgentChatWrapper } from '../AgentChatWrapper';
import { takePendingProfileMessage } from '../profileMessageCache';
import { AgentChatSidebar, AGENT_CHAT_SIDEBAR_ID } from './AgentChatSidebar';
import { CanonicalAgentChatPanel } from './CanonicalAgentChatPanel';

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
    initialForceNewChat?: boolean;
    initialAgentMessage?: string | null;
    isHistoryEnabled: boolean;
    areFileAttachmentsEnabled: boolean;
    isFeedbackEnabled: boolean;
    isHeadlessMode?: boolean;
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
        initialForceNewChat = false,
        initialAgentMessage,
        isHistoryEnabled,
        areFileAttachmentsEnabled,
        isFeedbackEnabled,
        isHeadlessMode = false,
    } = props;
    const { formatText } = useAgentNaming();
    const { isPrivateModeEnabled } = usePrivateModePreferences();
    const shouldUseHistory = isHistoryEnabled && !isPrivateModeEnabled;
    const pendingProfileMessage = useMemo(() => takePendingProfileMessage(agentName), [agentName]);
    const effectiveInitialAutoExecuteMessage = initialAutoExecuteMessage ?? pendingProfileMessage?.message;
    const effectiveInitialAutoExecuteMessageAttachments = pendingProfileMessage?.attachments;
    const [chats, setChats] = useState<Array<UserChatSummary>>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [activeMessages, setActiveMessages] = useState<Array<ChatMessage>>([]);
    const [activeJobs, setActiveJobs] = useState<Array<UserChatJob>>([]);
    const [activeChatDraftMessage, setActiveChatDraftMessage] = useState('');
    const [isBootstrapping, setIsBootstrapping] = useState(shouldUseHistory);
    const [isChatListLoading, setIsChatListLoading] = useState(shouldUseHistory);
    const [isActiveChatStreamConnected, setIsActiveChatStreamConnected] = useState(false);
    const [isCreatingChat, setIsCreatingChat] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const hasInitialAutoMessageBeenConsumedRef = useRef(false);
    const autoExecuteTargetChatIdRef = useRef<string | undefined>(initialForceNewChat ? undefined : initialChatId);
    const activeChatIdRef = useRef<string | null>(null);
    const activeChatDraftMessageRef = useRef('');
    const activeDraftDirtyRef = useRef(false);
    const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isRefreshingRef = useRef(false);
    const failedSendRef = useRef<{ signature: string; clientMessageId: string } | null>(null);

    useEffect(() => {
        activeChatIdRef.current = activeChatId;
    }, [activeChatId]);

    useEffect(() => {
        activeChatDraftMessageRef.current = activeChatDraftMessage;
    }, [activeChatDraftMessage]);

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
    const effectiveIsSidebarCollapsed = isMobileSidebarOpen ? false : isSidebarCollapsed;

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

            if (isHeadlessMode) {
                params.set('headless', '');
            }

            return `/agents/${encodeURIComponent(agentName)}/chat?${params.toString()}`;
        },
        [agentName, effectiveInitialAutoExecuteMessage, isHeadlessMode],
    );

    /**
     * Applies one canonical chat detail payload to local state.
     */
    const applyChatDetail = useCallback(
        (
            chatDetail: UserChatDetail | UserChatEnqueueResult,
            options: {
                preserveDirtyDraft?: boolean;
                includeInitialMessage?: boolean;
            } = {},
        ) => {
            setActiveChatId(chatDetail.chat.id);
            setActiveMessages([...chatDetail.messages]);
            setActiveJobs([...chatDetail.activeJobs]);
            setChats((previousChats) => replaceChatInList(previousChats, chatDetail.chat));

            const shouldPreserveDirtyDraft =
                options.preserveDirtyDraft === true &&
                activeDraftDirtyRef.current &&
                activeChatIdRef.current === chatDetail.chat.id;

            if (!shouldPreserveDirtyDraft) {
                const nextDraftMessage = chatDetail.draftMessage || '';
                activeDraftDirtyRef.current = false;
                setActiveChatDraftMessage(nextDraftMessage);
            }

            replaceBrowserUrlWithoutNavigation(
                buildChatRoute(chatDetail.chat.id, Boolean(options.includeInitialMessage)),
            );
        },
        [buildChatRoute],
    );

    /**
     * Applies one list snapshot to the currently selected chat.
     */
    const applySnapshot = useCallback(
        (
            snapshot: Awaited<ReturnType<typeof fetchUserChats>>,
            options: {
                preserveDirtyDraft?: boolean;
                includeInitialMessage?: boolean;
            } = {},
        ) => {
            setChats(snapshot.chats);
            if (!snapshot.activeChatId) {
                setActiveChatId(null);
                setActiveMessages([]);
                setActiveJobs([]);
                setActiveChatDraftMessage('');
                activeDraftDirtyRef.current = false;
                return;
            }

            setActiveChatId(snapshot.activeChatId);
            setActiveMessages([...snapshot.activeMessages]);
            setActiveJobs([...snapshot.activeJobs]);

            const shouldPreserveDirtyDraft =
                options.preserveDirtyDraft === true &&
                activeDraftDirtyRef.current &&
                activeChatIdRef.current === snapshot.activeChatId;

            if (!shouldPreserveDirtyDraft) {
                const nextDraftMessage = snapshot.activeDraftMessage || '';
                activeDraftDirtyRef.current = false;
                setActiveChatDraftMessage(nextDraftMessage);
            }

            replaceBrowserUrlWithoutNavigation(
                buildChatRoute(snapshot.activeChatId, Boolean(options.includeInitialMessage)),
            );
        },
        [buildChatRoute],
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
            const snapshot = await fetchUserChats(agentName, effectivePreferredChatId);
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
                    includeInitialMessage: Boolean(effectiveInitialAutoExecuteMessage),
                });
                setChats([
                    createdChat.chat,
                    ...snapshot.chats.filter((chat) => chat.id !== createdChat.chat.id),
                ]);
                return;
            }

            const shouldKeepInitialAutoMessage =
                !hasInitialAutoMessageBeenConsumedRef.current &&
                Boolean(effectiveInitialAutoExecuteMessage) &&
                (!autoExecuteTargetChatIdRef.current || autoExecuteTargetChatIdRef.current === snapshot.activeChatId);

            applySnapshot(snapshot, {
                includeInitialMessage: shouldKeepInitialAutoMessage,
            });
        },
        [
            agentName,
            applyChatDetail,
            applySnapshot,
            effectiveInitialAutoExecuteMessage,
            initialForceNewChat,
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
                const snapshot = await fetchUserChats(agentName, currentActiveChatId);
                if (!snapshot.activeChatId) {
                    await bootstrapChats(undefined);
                    return;
                }

                applySnapshot(snapshot, options);
            } finally {
                isRefreshingRef.current = false;
            }
        },
        [agentName, applySnapshot, bootstrapChats, shouldUseHistory],
    );

    useEffect(() => {
        if (!shouldUseHistory) {
            setChats([]);
            setActiveChatId(null);
            setActiveMessages([]);
            setActiveJobs([]);
            setActiveChatDraftMessage('');
            setIsActiveChatStreamConnected(false);
            setIsBootstrapping(false);
            setIsChatListLoading(false);
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
    }, [bootstrapChats, initialChatId, shouldUseHistory]);

    useEffect(() => {
        autoExecuteTargetChatIdRef.current = initialForceNewChat ? undefined : initialChatId;
    }, [initialChatId, initialForceNewChat]);

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
        if (!shouldUseHistory || !activeChatId) {
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
                            preserveDirtyDraft: true,
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
    }, [activeChatId, agentName, applyChatDetail, refreshActiveChat, shouldUseHistory]);

    useEffect(() => {
        if (!shouldUseHistory || !activeChatId) {
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
    }, [activeChatId, isActiveChatStreamConnected, refreshActiveChat, shouldUseHistory]);

    /**
     * Selects one existing chat.
     */
    const handleSelectChat = useCallback(
        async (chatId: string) => {
            if (chatId === activeChatIdRef.current) {
                return;
            }

            await flushActiveDraft();
            const snapshot = await fetchUserChats(agentName, chatId);
            applySnapshot(snapshot);
        },
        [agentName, applySnapshot, flushActiveDraft],
    );

    const handleSelectChatFromSidebar = useCallback(
        (chatId: string) => {
            void handleSelectChat(chatId);
            closeMobileSidebar();
        },
        [handleSelectChat, closeMobileSidebar],
    );

    /**
     * Creates a fresh chat and makes it active.
     */
    const handleCreateChat = useCallback(async () => {
        if (isCreatingChat) {
            return;
        }

        setIsCreatingChat(true);
        try {
            await flushActiveDraft();
            const createdChat = await createUserChat(agentName);
            applyChatDetail(createdChat);
        } catch (error) {
            notifyError(resolveErrorMessage(error, 'Failed to create chat.'));
        } finally {
            setIsCreatingChat(false);
        }
    }, [agentName, applyChatDetail, flushActiveDraft, isCreatingChat]);

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
                if (activeChatIdRef.current === chatId) {
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
        [agentName, bootstrapChats, formatText, refreshActiveChat],
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
     * Submits one user-authored chat turn for durable server-side execution.
     */
    const handleSubmitUserTurn = useCallback(
        async (payload: {
            message: string;
            attachments?: ChatMessage['attachments'];
            parameters?: Record<string, unknown>;
        }) => {
            const currentActiveChatId = activeChatIdRef.current;
            if (!shouldUseHistory || !currentActiveChatId) {
                throw new Error('No active chat selected.');
            }

            const signature = JSON.stringify({
                message: payload.message,
                attachments: payload.attachments || [],
            });
            const clientMessageId =
                failedSendRef.current?.signature === signature
                    ? failedSendRef.current.clientMessageId
                    : createUserChatClientMessageId();

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
                applyChatDetail(result, {
                    preserveDirtyDraft: false,
                });
            } catch (error) {
                failedSendRef.current = {
                    signature,
                    clientMessageId,
                };
                throw error;
            }
        },
        [agentName, applyChatDetail, shouldUseHistory],
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
                preserveDirtyDraft: true,
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

        if (typeof window === 'undefined') {
            return;
        }

        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete('message');
        window.history.replaceState(window.history.state, '', `${nextUrl.pathname}${nextUrl.search}`);
    }, []);

    const autoMessageTargetId = autoExecuteTargetChatIdRef.current;
    const autoExecuteMessage =
        !hasInitialAutoMessageBeenConsumedRef.current &&
        Boolean(effectiveInitialAutoExecuteMessage) &&
        Boolean(activeChatId) &&
        (!autoMessageTargetId || autoMessageTargetId === activeChatId)
            ? effectiveInitialAutoExecuteMessage
            : undefined;

    if (!shouldUseHistory) {
        return (
            <div className="w-full h-full flex flex-col">
                <PrivateModeHistoryBanner formatText={formatText} />
                <div className="flex-1">
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
                        isFeedbackEnabled={isFeedbackEnabled}
                        onAutoExecuteMessageConsumed={handleAutoExecuteMessageConsumed}
                    />
                </div>
            </div>
        );
    }

    if (isBootstrapping || !activeChatId) {
        return <AgentChatLoadingSkeleton showSidebar={!isHeadlessMode} isSidebarCollapsed={effectiveIsSidebarCollapsed} />;
    }

    const chatSurface = (
        <div className="relative flex-1 min-h-0">
            <CanonicalAgentChatPanel
                agentName={agentName}
                agentUrl={agentUrl}
                brandColor={brandColor}
                inputPlaceholder={inputPlaceholder}
                thinkingMessages={thinkingMessages}
                speechRecognitionLanguage={speechRecognitionLanguage}
                initialAgentMessage={initialAgentMessage}
                messages={activeMessages}
                draftMessage={activeChatDraftMessage}
                autoExecuteMessage={autoExecuteMessage}
                autoExecuteMessageAttachments={effectiveInitialAutoExecuteMessageAttachments}
                areFileAttachmentsEnabled={areFileAttachmentsEnabled}
                isFeedbackEnabled={isFeedbackEnabled}
                activeJobs={activeJobs}
                onDraftMessageChange={handleDraftMessageChange}
                onSubmitUserTurn={handleSubmitUserTurn}
                onStartNewChat={handleStartNewChatFromChatSurface}
                onCancelActiveJob={handleCancelActiveJob}
                onAutoExecuteMessageConsumed={handleAutoExecuteMessageConsumed}
            />
        </div>
    );

    if (isHeadlessMode) {
        return (
            <div className="w-full h-full flex min-h-0 bg-slate-50/80">
                <section className="flex-1 min-w-0 min-h-0 flex flex-col">{chatSurface}</section>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex min-h-0 bg-slate-50/80">
            <AgentChatSidebar
                chats={chats}
                activeChatId={activeChatId}
                isCreatingChat={isCreatingChat}
                isLoadingChats={isChatListLoading}
                formatText={formatText}
                formatChatTimestamp={formatChatTimestamp}
                onSelectChat={handleSelectChatFromSidebar}
                onCreateChat={handleCreateChat}
                onDeleteChat={handleDeleteChat}
                isCollapsed={effectiveIsSidebarCollapsed}
                onToggleCollapse={toggleSidebarCollapsed}
                isMobileSidebarOpen={isMobileSidebarOpen}
                onCloseMobileSidebar={closeMobileSidebar}
            />
            <SolidArrowButton
                direction="right"
                onClick={openMobileSidebar}
                className={`fixed left-2 top-1/2 z-40 -translate-y-1/2 md:hidden ${mobileHandleVisibility}`}
                aria-controls={AGENT_CHAT_SIDEBAR_ID}
                aria-expanded={isMobileSidebarOpen}
                aria-hidden={isMobileSidebarOpen}
                aria-label={formatText('Open chats sidebar')}
            />
            <section className="flex-1 min-w-0 min-h-0 flex flex-col">{chatSurface}</section>
        </div>
    );
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
function replaceChatInList(
    chats: ReadonlyArray<UserChatSummary>,
    targetChat: UserChatSummary,
): Array<UserChatSummary> {
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
