'use client';

import type { ChatMessage } from '@promptbook-local/types';
import moment from 'moment';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAgentNaming } from '../../../../components/AgentNaming/AgentNamingContext';
import { showConfirm } from '../../../../components/AsyncDialogs/asyncDialogs';
import { SaveFailureNotice } from '../../../../components/SaveFailureNotice/SaveFailureNotice';
import { AgentChatLoadingSkeleton } from '../../../../components/Skeleton/AgentChatLoadingSkeleton';
import { ChatThreadLoadingSkeleton } from '../../../../components/Skeleton/ChatThreadLoadingSkeleton';
import { ChatPersistence } from '../../../../utils/chatPersistenceClient';
import { SolidArrowButton } from '../../../../../../../src/book-components/icons/SolidArrowButton';
import {
    createUserChat,
    fetchUserChat,
    fetchUserChats,
    removeUserChat,
    saveUserChatMessages,
    saveUserChatDraft,
    UserChatSummary,
} from '../../../../utils/userChatClient';
import { AgentChatSidebar, AGENT_CHAT_SIDEBAR_ID } from './AgentChatSidebar';
import { AgentChatWrapper } from '../AgentChatWrapper';
import { takePendingProfileMessage } from '../profileMessageCache';
import { usePrivateModePreferences } from '../../../../components/PrivateModePreferences/PrivateModePreferencesProvider';

/**
 * Delay used before persisting chat messages to DB.
 */
const SAVE_DEBOUNCE_MS = 600;

/**
 * Delay before showing switching overlay to avoid flashing on fast chat switches.
 */
const SWITCHING_CHAT_OVERLAY_DELAY_MS = 180;

/**
 * Fallback message shown when persisting chat messages fails.
 */
const DEFAULT_CHAT_SAVE_FAILURE_MESSAGE = 'Chat save failed. Retry to persist the current conversation.';

/**
 * Fallback message shown when persisting chat draft fails.
 */
const DEFAULT_CHAT_DRAFT_SAVE_FAILURE_MESSAGE = 'Chat draft save failed. Retry to persist the current draft.';

/**
 * Optional settings for immediate chat persistence helpers.
 */
type PersistChatChangesOptions = {
    /**
     * Enables keepalive requests for page-unload saves.
     */
    keepalive?: boolean;
};

/**
 * Replaces browser URL without triggering App Router navigation/streaming.
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
 * Props for user-chat enabled full chat page.
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
    isHistoryEnabled: boolean;
    chatFailMessage?: string;
    areFileAttachmentsEnabled: boolean;
    isFeedbackEnabled: boolean;
    /**
     * Controls embed/headless mode where chat-selection sidebar is hidden.
     */
    isHeadlessMode?: boolean;
};

/**
 * Full chat page client with per-user chat history.
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
        isHistoryEnabled,
        chatFailMessage,
        areFileAttachmentsEnabled,
        isFeedbackEnabled,
        isHeadlessMode = false,
    } = props;
    const { formatText } = useAgentNaming();
    const { isPrivateModeEnabled } = usePrivateModePreferences();
    const shouldUseHistory = isHistoryEnabled && !isPrivateModeEnabled;
    const pendingProfileMessage = useMemo(
        () => takePendingProfileMessage(agentName),
        [agentName],
    );
    const effectiveInitialAutoExecuteMessage = initialAutoExecuteMessage ?? pendingProfileMessage?.message;
    const effectiveInitialAutoExecuteMessageAttachments = pendingProfileMessage?.attachments;

    const [chats, setChats] = useState<Array<UserChatSummary>>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [activeChatMountKey, setActiveChatMountKey] = useState(0);
    const [isBootstrapping, setIsBootstrapping] = useState(shouldUseHistory);
    const [isChatListLoading, setIsChatListLoading] = useState(shouldUseHistory);
    const [isCreatingChat, setIsCreatingChat] = useState(false);
    const [isSwitchingChat, setIsSwitchingChat] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [saveFailureMessage, setSaveFailureMessage] = useState<string | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
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

    const hasInitialAutoMessageBeenConsumedRef = useRef(false);
    const saveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const savedMessagesHashesRef = useRef<Map<string, string>>(new Map());
    const chatMessagesCacheRef = useRef<Map<string, ReadonlyArray<ChatMessage>>>(new Map());
    const isSwitchingChatRef = useRef(false);
    const autoExecuteTargetChatIdRef = useRef<string | undefined>(initialForceNewChat ? undefined : initialChatId);
    const draftSaveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const [activeChatDraftMessage, setActiveChatDraftMessage] = useState<string | null>(null);
    const chatDraftCacheRef = useRef<Map<string, string | null>>(new Map());

    const guestPersistenceKey = useMemo(
        () => `guest-chat-${encodeURIComponent(agentName)}-${Math.random().toString(36).slice(2)}`,
        [agentName],
    );

    /**
     * Builds local storage key used by `<AgentChat/>`.
     */
    const buildUserChatPersistenceKey = useCallback(
        (chatId: string) => `user-chat-${encodeURIComponent(agentName)}-${chatId}`,
        [agentName],
    );

    /**
     * Builds canonical route for one selected chat.
     */
    const buildChatRoute = useCallback(
        (chatId: string, includeInitialMessage: boolean = false) => {
            const params = new URLSearchParams();
            params.set('chat', chatId);

            if (includeInitialMessage && initialAutoExecuteMessage) {
                params.set('message', initialAutoExecuteMessage);
            }

            if (isHeadlessMode) {
                params.set('headless', '');
            }

            return `/agents/${encodeURIComponent(agentName)}/chat?${params.toString()}`;
        },
        [agentName, initialAutoExecuteMessage, isHeadlessMode],
    );

    /**
     * Resolves cached messages for one chat from memory cache or local storage.
     */
    const getCachedChatMessages = useCallback(
        (chatId: string): ReadonlyArray<ChatMessage> | undefined => {
            if (chatMessagesCacheRef.current.has(chatId)) {
                return chatMessagesCacheRef.current.get(chatId);
            }

            if (!ChatPersistence.isAvailable()) {
                return undefined;
            }

            const persistedMessages = ChatPersistence.loadMessages(buildUserChatPersistenceKey(chatId));
            if (persistedMessages.length === 0) {
                return undefined;
            }

            chatMessagesCacheRef.current.set(chatId, persistedMessages);
            return persistedMessages;
        },
        [buildUserChatPersistenceKey],
    );

    /**
     * Seeds local storage for selected chat and forces chat remount.
     */
    const prepareChatInLocalStorage = useCallback(
        (chatId: string, messages: ReadonlyArray<ChatMessage>) => {
            const normalizedMessages = [...messages];
            const persistenceKey = buildUserChatPersistenceKey(chatId);

            if (ChatPersistence.isAvailable()) {
                if (normalizedMessages.length > 0) {
                    ChatPersistence.saveMessages(persistenceKey, normalizedMessages);
                } else {
                    ChatPersistence.clearMessages(persistenceKey);
                }
            }

            savedMessagesHashesRef.current.set(chatId, JSON.stringify(normalizedMessages));
            chatMessagesCacheRef.current.set(chatId, normalizedMessages);
            setActiveChatId(chatId);
            setActiveChatMountKey((value) => value + 1);
        },
        [buildUserChatPersistenceKey],
    );

    /**
     * Activates one chat in UI and updates URL query without triggering route refresh.
     */
    const activateChat = useCallback(
        (
            chatId: string,
            messages: ReadonlyArray<ChatMessage>,
            options: {
                includeInitialMessage?: boolean;
                draftMessage?: string | null;
            } = {},
        ) => {
            prepareChatInLocalStorage(chatId, messages);
            const nextDraftMessage = options.draftMessage ?? null;
            chatDraftCacheRef.current.set(chatId, nextDraftMessage);
            setActiveChatDraftMessage(nextDraftMessage);
            replaceBrowserUrlWithoutNavigation(buildChatRoute(chatId, Boolean(options.includeInitialMessage)));
        },
        [buildChatRoute, prepareChatInLocalStorage],
    );

    /**
     * Fetches user-chat snapshot and ensures at least one active chat.
     */
    const bootstrapChats = useCallback(
        async (preferredChatId?: string) => {
            const effectivePreferredChatId = initialForceNewChat ? undefined : preferredChatId;
            const snapshot = await fetchUserChats(agentName, effectivePreferredChatId);
            let nextChats = snapshot.chats;
            let resolvedActiveChatId = snapshot.activeChatId;
            let resolvedMessages = snapshot.activeMessages;
            let resolvedDraftMessage = snapshot.activeDraftMessage ?? null;

            const shouldCreateFreshChatForInitialMessage =
                !hasInitialAutoMessageBeenConsumedRef.current &&
                Boolean(effectiveInitialAutoExecuteMessage) &&
                (initialForceNewChat || !effectivePreferredChatId);

            if (!resolvedActiveChatId || shouldCreateFreshChatForInitialMessage) {
                const createdChat = await createUserChat(agentName);
                nextChats = [createdChat.chat, ...nextChats.filter((chat) => chat.id !== createdChat.chat.id)];
                resolvedActiveChatId = createdChat.chat.id;
                resolvedMessages = createdChat.messages;
                resolvedDraftMessage = createdChat.draftMessage ?? null;

                if (effectiveInitialAutoExecuteMessage) {
                    autoExecuteTargetChatIdRef.current = createdChat.chat.id;
                }
            }

            setChats(nextChats);

            const shouldKeepInitialAutoMessage =
                !hasInitialAutoMessageBeenConsumedRef.current &&
                Boolean(effectiveInitialAutoExecuteMessage) &&
                (!autoExecuteTargetChatIdRef.current || resolvedActiveChatId === autoExecuteTargetChatIdRef.current);

            activateChat(resolvedActiveChatId, resolvedMessages, {
                includeInitialMessage: Boolean(initialAutoExecuteMessage) && shouldKeepInitialAutoMessage,
                draftMessage: resolvedDraftMessage,
            });
        },
        [activateChat, agentName, effectiveInitialAutoExecuteMessage, initialAutoExecuteMessage, initialForceNewChat],
    );

    /**
     * Persists one chat message array immediately and updates sidebar summary.
     */
    const persistChatMessagesNow = useCallback(
        async (
            chatId: string,
            messages: ReadonlyArray<ChatMessage>,
            serializedMessages: string,
            options: PersistChatChangesOptions = {},
        ): Promise<void> => {
            const chatDetail = await saveUserChatMessages(agentName, chatId, messages, {
                keepalive: options.keepalive,
            });

            savedMessagesHashesRef.current.set(chatId, serializedMessages);
            setSaveFailureMessage(null);
            setChats((previousChats) =>
                moveChatToTop(previousChats, chatDetail.chat).map((chat) =>
                    chat.id === chatDetail.chat.id ? chatDetail.chat : chat,
                ),
            );
        },
        [agentName],
    );

    /**
     * Persists one chat draft message immediately.
     */
    const persistChatDraftNow = useCallback(
        async (chatId: string, draftMessage: string | null, options: PersistChatChangesOptions = {}): Promise<void> => {
            await saveUserChatDraft(agentName, chatId, draftMessage, {
                keepalive: options.keepalive,
            });
            setSaveFailureMessage(null);
        },
        [agentName],
    );

    /**
     * Flushes pending debounced message saves and draft saves.
     */
    const flushPendingPersistenceTimers = useCallback(
        (options: PersistChatChangesOptions = {}) => {
            for (const [chatId, timer] of saveTimersRef.current) {
                clearTimeout(timer);
                saveTimersRef.current.delete(chatId);

                const messages = chatMessagesCacheRef.current.get(chatId);
                if (!messages) {
                    continue;
                }

                const serializedMessages = JSON.stringify(messages);
                if (savedMessagesHashesRef.current.get(chatId) === serializedMessages) {
                    continue;
                }

                void persistChatMessagesNow(chatId, messages, serializedMessages, options).catch((error) => {
                    console.error('[user-chat] Failed to flush pending chat messages', error);
                    setSaveFailureMessage(error instanceof Error ? error.message : DEFAULT_CHAT_SAVE_FAILURE_MESSAGE);
                });
            }

            for (const [chatId, timer] of draftSaveTimersRef.current) {
                clearTimeout(timer);
                draftSaveTimersRef.current.delete(chatId);

                const draftMessage = chatDraftCacheRef.current.get(chatId) ?? null;
                void persistChatDraftNow(chatId, draftMessage, options).catch((error) => {
                    console.error('[user-chat] Failed to flush pending chat draft', error);
                    setSaveFailureMessage(
                        error instanceof Error ? error.message : DEFAULT_CHAT_DRAFT_SAVE_FAILURE_MESSAGE,
                    );
                });
            }
        },
        [persistChatDraftNow, persistChatMessagesNow],
    );

    /**
     * Retries persisting current active chat after a save failure.
     */
    const handleRetrySave = useCallback(() => {
        if (!shouldUseHistory || !activeChatId) {
            return;
        }

        setSaveFailureMessage(null);
        const activeMessages = chatMessagesCacheRef.current.get(activeChatId) || [];
        const serializedMessages = JSON.stringify(activeMessages);
        const activeDraftMessage = chatDraftCacheRef.current.get(activeChatId) ?? null;
        const pendingRequests: Array<Promise<void>> = [];

        if (savedMessagesHashesRef.current.get(activeChatId) !== serializedMessages) {
            pendingRequests.push(persistChatMessagesNow(activeChatId, activeMessages, serializedMessages));
        }

        pendingRequests.push(persistChatDraftNow(activeChatId, activeDraftMessage));

        if (pendingRequests.length === 0) {
            return;
        }

        void Promise.all(pendingRequests).catch((error) => {
            console.error('[user-chat] Failed to retry chat save', error);
            setSaveFailureMessage(error instanceof Error ? error.message : DEFAULT_CHAT_SAVE_FAILURE_MESSAGE);
        });
    }, [activeChatId, persistChatDraftNow, persistChatMessagesNow, shouldUseHistory]);

    useEffect(() => {
        if (!shouldUseHistory) {
            setChats([]);
            setSaveFailureMessage(null);
            setIsBootstrapping(false);
            setIsChatListLoading(false);
            return;
        }

        let isDisposed = false;

        async function bootstrap(): Promise<void> {
            setIsBootstrapping(true);
            setIsChatListLoading(true);
            setErrorMessage(null);
            setSaveFailureMessage(null);

            try {
                await bootstrapChats(initialChatId);
            } catch (error) {
                if (!isDisposed) {
                    setErrorMessage(error instanceof Error ? error.message : 'Failed to load chats.');
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
        if (typeof window === 'undefined') {
            return;
        }

        const flushWithKeepalive = () => {
            flushPendingPersistenceTimers({ keepalive: true });
        };

        window.addEventListener('pagehide', flushWithKeepalive);
        window.addEventListener('beforeunload', flushWithKeepalive);

        return () => {
            window.removeEventListener('pagehide', flushWithKeepalive);
            window.removeEventListener('beforeunload', flushWithKeepalive);
            flushPendingPersistenceTimers();
        };
    }, [flushPendingPersistenceTimers]);

    /**
     * Selects one existing chat and hydrates it into local storage.
     */
    const handleSelectChat = useCallback(
        async (chatId: string) => {
            if (chatId === activeChatId || isSwitchingChatRef.current) {
                return;
            }

            setErrorMessage(null);

            const cachedMessages = getCachedChatMessages(chatId);
            if (cachedMessages) {
                activateChat(chatId, cachedMessages);
                return;
            }

            isSwitchingChatRef.current = true;
            let hasShownSwitchingOverlay = false;
            const switchingOverlayTimer = setTimeout(() => {
                hasShownSwitchingOverlay = true;
                setIsSwitchingChat(true);
            }, SWITCHING_CHAT_OVERLAY_DELAY_MS);

            try {
                const chatDetail = await fetchUserChat(agentName, chatId);
                activateChat(chatId, chatDetail.messages, {
                    draftMessage: chatDetail.draftMessage ?? null,
                });
            } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : 'Failed to load chat.');
            } finally {
                isSwitchingChatRef.current = false;
                clearTimeout(switchingOverlayTimer);
                if (hasShownSwitchingOverlay) {
                    setIsSwitchingChat(false);
                }
            }
        },
        [activeChatId, activateChat, agentName, getCachedChatMessages],
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
        setErrorMessage(null);

        try {
            const createdChat = await createUserChat(agentName);

            setChats((previousChats) => [
                createdChat.chat,
                ...previousChats.filter((existingChat) => existingChat.id !== createdChat.chat.id),
            ]);
            activateChat(createdChat.chat.id, createdChat.messages, {
                draftMessage: createdChat.draftMessage ?? null,
            });
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to create chat.');
        } finally {
            setIsCreatingChat(false);
        }
    }, [activateChat, agentName, isCreatingChat]);

    /**
     * Deletes one chat and resolves next active chat.
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

            setErrorMessage(null);

            try {
                setIsChatListLoading(true);
                await removeUserChat(agentName, chatId);
                const existingTimer = saveTimersRef.current.get(chatId);
                if (existingTimer) {
                    clearTimeout(existingTimer);
                    saveTimersRef.current.delete(chatId);
                }
                const existingDraftTimer = draftSaveTimersRef.current.get(chatId);
                if (existingDraftTimer) {
                    clearTimeout(existingDraftTimer);
                    draftSaveTimersRef.current.delete(chatId);
                }
                savedMessagesHashesRef.current.delete(chatId);
                chatMessagesCacheRef.current.delete(chatId);
                chatDraftCacheRef.current.delete(chatId);
                await bootstrapChats(activeChatId === chatId ? undefined : activeChatId || undefined);
            } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : 'Failed to delete chat.');
            } finally {
                setIsChatListLoading(false);
            }
        },
        [activeChatId, agentName, bootstrapChats, formatText],
    );

    /**
     * Persists updated chat messages using debounced full JSON replacement.
     */
    const handleMessagesChange = useCallback(
        (messages: ReadonlyArray<ChatMessage>) => {
            if (!shouldUseHistory || !activeChatId) {
                return;
            }

            const chatId = activeChatId;
            chatMessagesCacheRef.current.set(chatId, [...messages]);
            const serializedMessages = JSON.stringify(messages);
            const lastSavedHash = savedMessagesHashesRef.current.get(chatId);

            if (lastSavedHash === serializedMessages) {
                return;
            }

            const existingTimer = saveTimersRef.current.get(chatId);
            if (existingTimer) {
                clearTimeout(existingTimer);
            }

            const nextTimer = setTimeout(() => {
                void persistChatMessagesNow(chatId, messages, serializedMessages)
                    .catch((error) => {
                        console.error('[user-chat] Failed to persist chat messages', error);
                        setSaveFailureMessage(error instanceof Error ? error.message : DEFAULT_CHAT_SAVE_FAILURE_MESSAGE);
                    })
                    .finally(() => {
                        saveTimersRef.current.delete(chatId);
                    });
            }, SAVE_DEBOUNCE_MS);

            saveTimersRef.current.set(chatId, nextTimer);
        },
        [activeChatId, persistChatMessagesNow, shouldUseHistory],
    );

    /**
     * Persists draft message using debounced save to avoid excessive API calls.
     */
    const handleDraftMessageChange = useCallback(
        (draftMessage: string) => {
            if (!shouldUseHistory || !activeChatId) {
                return;
            }

            const chatId = activeChatId;
            setActiveChatDraftMessage(draftMessage);
            chatDraftCacheRef.current.set(chatId, draftMessage || null);

            const existingTimer = draftSaveTimersRef.current.get(chatId);
            if (existingTimer) {
                clearTimeout(existingTimer);
            }

            const nextTimer = setTimeout(() => {
                void persistChatDraftNow(chatId, draftMessage || null)
                    .catch((error) => {
                        console.error('[user-chat] Failed to persist draft message', error);
                        setSaveFailureMessage(
                            error instanceof Error ? error.message : DEFAULT_CHAT_DRAFT_SAVE_FAILURE_MESSAGE,
                        );
                    })
                    .finally(() => {
                        draftSaveTimersRef.current.delete(chatId);
                    });
            }, SAVE_DEBOUNCE_MS);

            draftSaveTimersRef.current.set(chatId, nextTimer);
        },
        [activeChatId, persistChatDraftNow, shouldUseHistory],
    );

    /**
     * Handles in-chat "New chat" action by creating and activating a fresh chat entry.
     */
    const handleStartNewChatFromChatSurface = useCallback(async () => {
        await handleCreateChat();
    }, [handleCreateChat]);

    const autoMessageTargetId = autoExecuteTargetChatIdRef.current;
    const autoExecuteMessage =
        !hasInitialAutoMessageBeenConsumedRef.current &&
        Boolean(effectiveInitialAutoExecuteMessage) &&
        Boolean(activeChatId) &&
        (!autoMessageTargetId || autoMessageTargetId === activeChatId)
            ? effectiveInitialAutoExecuteMessage
            : undefined;

    const handleAutoExecuteMessageConsumed = useCallback(() => {
        hasInitialAutoMessageBeenConsumedRef.current = true;
    }, []);

    if (!shouldUseHistory) {
        return (
            <div className="w-full h-full flex flex-col">
                <PrivateModeHistoryBanner formatText={formatText} />
                <div className="flex-1">
                    <AgentChatWrapper
                        key={`guest-${guestPersistenceKey}`}
                        agentName={agentName}
                        agentUrl={agentUrl}
                        autoExecuteMessage={effectiveInitialAutoExecuteMessage}
                        autoExecuteMessageAttachments={effectiveInitialAutoExecuteMessageAttachments}
                        brandColor={brandColor}
                        inputPlaceholder={inputPlaceholder}
                        thinkingMessages={thinkingMessages}
                        speechRecognitionLanguage={speechRecognitionLanguage}
                        persistenceKey={guestPersistenceKey}
                        areFileAttachmentsEnabled={areFileAttachmentsEnabled}
                        isFeedbackEnabled={isFeedbackEnabled}
                        chatFailMessage={chatFailMessage}
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
            {isSwitchingChat && (
                <div className="absolute inset-0 z-20 border-y border-slate-200/70 bg-white/85 backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-950/80">
                    <ChatThreadLoadingSkeleton />
                </div>
            )}

            <AgentChatWrapper
                key={`${activeChatId}:${activeChatMountKey}`}
                agentName={agentName}
                agentUrl={agentUrl}
                defaultMessage={activeChatDraftMessage ?? undefined}
                autoExecuteMessage={autoExecuteMessage}
                autoExecuteMessageAttachments={effectiveInitialAutoExecuteMessageAttachments}
                brandColor={brandColor}
                inputPlaceholder={inputPlaceholder}
                thinkingMessages={thinkingMessages}
                speechRecognitionLanguage={speechRecognitionLanguage}
                persistenceKey={buildUserChatPersistenceKey(activeChatId)}
                onMessagesChange={handleMessagesChange}
                onInputTextChange={handleDraftMessageChange}
                areFileAttachmentsEnabled={areFileAttachmentsEnabled}
                isFeedbackEnabled={isFeedbackEnabled}
                chatFailMessage={chatFailMessage}
                onStartNewChat={handleStartNewChatFromChatSurface}
                onAutoExecuteMessageConsumed={handleAutoExecuteMessageConsumed}
            />
        </div>
    );

    const errorBanner = errorMessage ? (
        <div className="border-t border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{errorMessage}</div>
    ) : null;
    const saveFailureBanner = saveFailureMessage ? (
        <SaveFailureNotice className="m-3" message={saveFailureMessage} onRetry={handleRetrySave} />
    ) : null;

    if (isHeadlessMode) {
        return (
            <div className="w-full h-full flex min-h-0 bg-slate-50/80">
                <section className="flex-1 min-w-0 min-h-0 flex flex-col">
                    {chatSurface}
                    {saveFailureBanner}
                    {errorBanner}
                </section>
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
            <section className="flex-1 min-w-0 min-h-0 flex flex-col">
                {chatSurface}
                {saveFailureBanner}
                {errorBanner}
            </section>
        </div>
    );
}

/**
 * Moves one chat summary to the top of list while preserving other items.
 */
function moveChatToTop(chats: ReadonlyArray<UserChatSummary>, targetChat: UserChatSummary): Array<UserChatSummary> {
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
