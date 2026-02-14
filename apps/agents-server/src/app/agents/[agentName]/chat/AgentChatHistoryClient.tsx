'use client';

import type { ChatMessage } from '@promptbook-local/types';
import { MessageSquarePlusIcon, Trash2Icon } from 'lucide-react';
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
    isHistoryEnabled: boolean;
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
        isHistoryEnabled,
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

    const hasInitialAutoMessageBeenConsumedRef = useRef(false);
    const saveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const savedMessagesHashesRef = useRef<Map<string, string>>(new Map());
    const autoExecuteTargetChatIdRef = useRef<string | undefined>(initialChatId);

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
            const snapshot = await fetchUserChats(agentName, preferredChatId);
            let nextChats = snapshot.chats;
            let resolvedActiveChatId = snapshot.activeChatId;
            let resolvedMessages = snapshot.activeMessages;

            const shouldCreateFreshChatForInitialMessage =
                !hasInitialAutoMessageBeenConsumedRef.current && Boolean(initialAutoExecuteMessage) && !preferredChatId;

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
        [agentName, buildChatRoute, initialAutoExecuteMessage, initialChatId, prepareChatInLocalStorage, router],
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
        autoExecuteTargetChatIdRef.current = initialChatId;
    }, [initialChatId]);

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
            <aside className="hidden md:flex w-80 flex-col border-r border-slate-200 bg-white/90 backdrop-blur-sm">
                <div className="p-3 border-b border-slate-200">
                    <button
                        type="button"
                        onClick={handleCreateChat}
                        disabled={isCreatingChat}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    >
                        <MessageSquarePlusIcon className="w-4 h-4" />
                        {isCreatingChat ? formatText('Creating...') : formatText('New chat')}
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {chats.map((chat) => {
                        const isActive = chat.id === activeChatId;
                        return (
                            <div
                                key={chat.id}
                                className={`group relative rounded-xl border ${
                                    isActive
                                        ? 'border-blue-300 bg-blue-50 shadow-sm'
                                        : 'border-transparent hover:border-slate-200 hover:bg-slate-100/80'
                                }`}
                            >
                                <button
                                    type="button"
                                    className="w-full text-left px-3 py-3 pr-10"
                                    onClick={() => handleSelectChat(chat.id)}
                                >
                                    <div className="text-sm font-medium text-slate-800 truncate">
                                        {chat.title || formatText('New chat')}
                                    </div>
                                    <div className="text-xs text-slate-500 truncate mt-1">
                                        {chat.preview || formatText('No messages yet')}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-2">
                                        {formatChatTimestamp(chat.lastMessageAt || chat.updatedAt)}
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    className="absolute right-2 top-2 p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-white/90 opacity-0 group-hover:opacity-100"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        void handleDeleteChat(chat.id);
                                    }}
                                    title={formatText('Delete chat')}
                                >
                                    <Trash2Icon className="w-4 h-4" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </aside>

            <section className="flex-1 min-w-0 min-h-0 flex flex-col">
                <div className="md:hidden border-b border-slate-200 bg-white/90 p-2 space-y-2">
                    <button
                        type="button"
                        onClick={handleCreateChat}
                        disabled={isCreatingChat}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                    >
                        <MessageSquarePlusIcon className="w-4 h-4" />
                        {isCreatingChat ? formatText('Creating...') : formatText('New chat')}
                    </button>

                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {chats.map((chat) => (
                            <button
                                key={chat.id}
                                type="button"
                                onClick={() => handleSelectChat(chat.id)}
                                className={`shrink-0 rounded-full px-3 py-1.5 text-xs border ${
                                    chat.id === activeChatId
                                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                                        : 'border-slate-300 bg-white text-slate-700'
                                }`}
                            >
                                {chat.title || formatText('New chat')}
                            </button>
                        ))}
                    </div>
                </div>

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
