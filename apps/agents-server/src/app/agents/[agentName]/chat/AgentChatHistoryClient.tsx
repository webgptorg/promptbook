'use client';

import type { ChatMessage } from '@promptbook-local/types';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAgentNaming } from '../../../../components/AgentNaming/AgentNamingContext';
import { showConfirm } from '../../../../components/AsyncDialogs/asyncDialogs';
import { ChatPersistence } from '../../../../utils/chatPersistenceClient';
import {
    createUserChat,
    fetchUserChat,
    fetchUserChats,
    removeUserChat,
    saveUserChatMessages,
    UserChatSummary,
} from '../../../../utils/userChatClient';
import { AgentChatSidebar, AGENT_CHAT_SIDEBAR_ID } from './AgentChatSidebar';
import { AgentChatWrapper } from '../AgentChatWrapper';

/**
 * Delay used before persisting chat messages to DB.
 */
const SAVE_DEBOUNCE_MS = 600;

/**
 * Props for user-chat enabled full chat page.
 */
type AgentChatHistoryClientProps = {
    agentName: string;
    agentUrl: string;
    brandColor?: string;
    thinkingMessages?: ReadonlyArray<string>;
    speechRecognitionLanguage?: string;
    initialChatId?: string;
    initialAutoExecuteMessage?: string;
    initialForceNewChat?: boolean;
    isHistoryEnabled: boolean;
    chatFailMessage?: string;
};

/**
 * Full chat page client with per-user chat history.
 */
export function AgentChatHistoryClient(props: AgentChatHistoryClientProps) {
    const {
        agentName,
        agentUrl,
        brandColor,
        thinkingMessages,
        speechRecognitionLanguage,
        initialChatId,
        initialAutoExecuteMessage,
        initialForceNewChat = false,
        isHistoryEnabled,
        chatFailMessage,
    } = props;
    const router = useRouter();
    const { formatText } = useAgentNaming();

    const [chats, setChats] = useState<Array<UserChatSummary>>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [activeChatMountKey, setActiveChatMountKey] = useState(0);
    const [isBootstrapping, setIsBootstrapping] = useState(isHistoryEnabled);
    const [isCreatingChat, setIsCreatingChat] = useState(false);
    const [isSwitchingChat, setIsSwitchingChat] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
    const autoExecuteTargetChatIdRef = useRef<string | undefined>(initialForceNewChat ? undefined : initialChatId);

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

            return `/agents/${encodeURIComponent(agentName)}/chat?${params.toString()}`;
        },
        [agentName, initialAutoExecuteMessage],
    );

    /**
     * Seeds local storage for selected chat and forces chat remount.
     */
    const prepareChatInLocalStorage = useCallback(
        (chatId: string, messages: ReadonlyArray<ChatMessage>) => {
            const persistenceKey = buildUserChatPersistenceKey(chatId);

            if (ChatPersistence.isAvailable()) {
                if (messages.length > 0) {
                    ChatPersistence.saveMessages(persistenceKey, messages);
                } else {
                    ChatPersistence.clearMessages(persistenceKey);
                }
            }

            savedMessagesHashesRef.current.set(chatId, JSON.stringify(messages));
            setActiveChatId(chatId);
            setActiveChatMountKey((value) => value + 1);
        },
        [buildUserChatPersistenceKey],
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

            const shouldCreateFreshChatForInitialMessage =
                !hasInitialAutoMessageBeenConsumedRef.current &&
                Boolean(initialAutoExecuteMessage) &&
                (initialForceNewChat || !effectivePreferredChatId);

            if (!resolvedActiveChatId || shouldCreateFreshChatForInitialMessage) {
                const createdChat = await createUserChat(agentName);
                nextChats = [createdChat.chat, ...nextChats.filter((chat) => chat.id !== createdChat.chat.id)];
                resolvedActiveChatId = createdChat.chat.id;
                resolvedMessages = createdChat.messages;

                if (initialAutoExecuteMessage) {
                    autoExecuteTargetChatIdRef.current = createdChat.chat.id;
                }
            }

            setChats(nextChats);
            prepareChatInLocalStorage(resolvedActiveChatId, resolvedMessages);

            const shouldKeepInitialAutoMessage =
                !hasInitialAutoMessageBeenConsumedRef.current &&
                Boolean(initialAutoExecuteMessage) &&
                (!autoExecuteTargetChatIdRef.current || resolvedActiveChatId === autoExecuteTargetChatIdRef.current);

            router.replace(buildChatRoute(resolvedActiveChatId, shouldKeepInitialAutoMessage));
        },
        [agentName, buildChatRoute, initialAutoExecuteMessage, initialForceNewChat, prepareChatInLocalStorage, router],
    );

    useEffect(() => {
        if (!isHistoryEnabled) {
            return;
        }

        let isDisposed = false;

        async function bootstrap(): Promise<void> {
            setIsBootstrapping(true);
            setErrorMessage(null);

            try {
                await bootstrapChats(initialChatId);
            } catch (error) {
                if (!isDisposed) {
                    setErrorMessage(error instanceof Error ? error.message : 'Failed to load chats.');
                }
            } finally {
                if (!isDisposed) {
                    setIsBootstrapping(false);
                }
            }
        }

        void bootstrap();

        return () => {
            isDisposed = true;
        };
    }, [bootstrapChats, initialChatId, isHistoryEnabled]);

    useEffect(() => {
        autoExecuteTargetChatIdRef.current = initialForceNewChat ? undefined : initialChatId;
    }, [initialChatId, initialForceNewChat]);

    useEffect(() => {
        const activeSaveTimers = saveTimersRef.current;

        return () => {
            for (const timer of activeSaveTimers.values()) {
                clearTimeout(timer);
            }
            activeSaveTimers.clear();
        };
    }, []);

    /**
     * Selects one existing chat and hydrates it into local storage.
     */
    const handleSelectChat = useCallback(
        async (chatId: string) => {
            if (chatId === activeChatId || isSwitchingChat) {
                return;
            }

            setIsSwitchingChat(true);
            setErrorMessage(null);

            try {
                const chatDetail = await fetchUserChat(agentName, chatId);
                prepareChatInLocalStorage(chatId, chatDetail.messages);
                router.replace(buildChatRoute(chatId));
            } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : 'Failed to load chat.');
            } finally {
                setIsSwitchingChat(false);
            }
        },
        [activeChatId, agentName, buildChatRoute, isSwitchingChat, prepareChatInLocalStorage, router],
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
            prepareChatInLocalStorage(createdChat.chat.id, createdChat.messages);
            router.replace(buildChatRoute(createdChat.chat.id));
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to create chat.');
        } finally {
            setIsCreatingChat(false);
        }
    }, [agentName, buildChatRoute, isCreatingChat, prepareChatInLocalStorage, router]);

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
                await removeUserChat(agentName, chatId);
                await bootstrapChats(activeChatId === chatId ? undefined : activeChatId || undefined);
            } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : 'Failed to delete chat.');
            }
        },
        [activeChatId, agentName, bootstrapChats, formatText],
    );

    /**
     * Persists updated chat messages using debounced full JSON replacement.
     */
    const handleMessagesChange = useCallback(
        (messages: ReadonlyArray<ChatMessage>) => {
            if (!isHistoryEnabled || !activeChatId) {
                return;
            }

            const chatId = activeChatId;
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
                void saveUserChatMessages(agentName, chatId, messages)
                    .then((chatDetail) => {
                        savedMessagesHashesRef.current.set(chatId, serializedMessages);
                        setChats((previousChats) =>
                            moveChatToTop(previousChats, chatDetail.chat).map((chat) =>
                                chat.id === chatDetail.chat.id ? chatDetail.chat : chat,
                            ),
                        );
                    })
                    .catch((error) => {
                        console.error('[user-chat] Failed to persist chat messages', error);
                    })
                    .finally(() => {
                        saveTimersRef.current.delete(chatId);
                    });
            }, SAVE_DEBOUNCE_MS);

            saveTimersRef.current.set(chatId, nextTimer);
        },
        [activeChatId, agentName, isHistoryEnabled],
    );

    const autoMessageTargetId = autoExecuteTargetChatIdRef.current;
    const autoExecuteMessage =
        !hasInitialAutoMessageBeenConsumedRef.current &&
        Boolean(initialAutoExecuteMessage) &&
        Boolean(activeChatId) &&
        (!autoMessageTargetId || autoMessageTargetId === activeChatId)
            ? initialAutoExecuteMessage
            : undefined;

    useEffect(() => {
        if (autoExecuteMessage) {
            hasInitialAutoMessageBeenConsumedRef.current = true;
        }
    }, [autoExecuteMessage]);

    if (!isHistoryEnabled) {
        return (
            <AgentChatWrapper
                key={`guest-${guestPersistenceKey}`}
                agentUrl={agentUrl}
                autoExecuteMessage={initialAutoExecuteMessage}
                brandColor={brandColor}
                thinkingMessages={thinkingMessages}
                speechRecognitionLanguage={speechRecognitionLanguage}
                persistenceKey={guestPersistenceKey}
                chatFailMessage={chatFailMessage}
            />
        );
    }

    if (isBootstrapping || !activeChatId) {
        return (
            <div className="w-full h-full flex items-center justify-center text-sm text-slate-600">
                {formatText('Loading chats...')}
            </div>
        );
    }

    return (
        <div className="w-full h-full flex min-h-0 bg-slate-50/80">
            <AgentChatSidebar
                chats={chats}
                activeChatId={activeChatId}
                isCreatingChat={isCreatingChat}
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
            <button
                type="button"
                onClick={openMobileSidebar}
                className={`fixed left-2 top-1/2 z-40 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-md backdrop-blur transition-all duration-300 ease-in-out md:hidden ${mobileHandleVisibility}`}
                aria-controls={AGENT_CHAT_SIDEBAR_ID}
                aria-expanded={isMobileSidebarOpen}
                aria-hidden={isMobileSidebarOpen}
                aria-label={formatText('Open chats sidebar')}
            >
                <span className="text-lg font-semibold leading-none" aria-hidden="true">
                    &gt;
                </span>
            </button>
            <section className="flex-1 min-w-0 min-h-0 flex flex-col">
                <div className="relative flex-1 min-h-0">
                    {isSwitchingChat && (
                        <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[1px] flex items-center justify-center text-sm text-slate-700">
                            {formatText('Loading chat...')}
                        </div>
                    )}

                    <AgentChatWrapper
                        key={`${activeChatId}:${activeChatMountKey}`}
                        agentUrl={agentUrl}
                        autoExecuteMessage={autoExecuteMessage}
                        brandColor={brandColor}
                        thinkingMessages={thinkingMessages}
                        speechRecognitionLanguage={speechRecognitionLanguage}
                        persistenceKey={buildUserChatPersistenceKey(activeChatId)}
                        onMessagesChange={handleMessagesChange}
                        chatFailMessage={chatFailMessage}
                    />
                </div>

                {errorMessage && (
                    <div className="border-t border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                        {errorMessage}
                    </div>
                )}
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
 * Formats timestamp into a compact localized string.
 */
function formatChatTimestamp(timestamp: string): string {
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) {
        return timestamp;
    }

    return parsed.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
