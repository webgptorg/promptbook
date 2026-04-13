'use client';

import type { ChatMessage } from '@promptbook-local/types';
import { useEffect } from 'react';
import { notifyError } from '../../../../components/Notifications/notifications';
import { streamUserChat, type UserChatDetail, type UserChatSummary } from '../../../../utils/userChatClient';
import { resolveAgentChatHistoryErrorMessage } from './resolveAgentChatHistoryErrorMessage';
import { reconcilePendingOutboundMessages } from './usePendingOutboundMessages';
import type { ApplyAgentChatDetail, RefreshActiveChat, SyncActiveChatSelection } from './useAgentChatHistorySyncState';

/**
 * Reconnect delay after one canonical chat-stream disconnect.
 *
 * @private function of useAgentChatHistoryClientState
 */
const USER_CHAT_STREAM_RECONNECT_DELAY_MS = 1_500;

/**
 * Background refresh cadence used when the live stream is temporarily disconnected.
 *
 * @private function of useAgentChatHistoryClientState
 */
const DISCONNECTED_CHAT_REFRESH_INTERVAL_MS = 4_000;

/**
 * Periodic sidebar/list refresh cadence while the active chat stream is healthy.
 *
 * @private function of useAgentChatHistoryClientState
 */
const CHAT_LIST_REFRESH_INTERVAL_MS = 20_000;

/**
 * Inputs required to register side effects for durable chat-history synchronization.
 *
 * @private function of useAgentChatHistoryClientState
 */
type UseAgentChatHistorySyncEffectsProps = {
    readonly shouldUseHistory: boolean;
    readonly initialChatId?: string;
    readonly initialForceNewChat: boolean;
    readonly initialShareTargetId?: string;
    readonly autoExecuteTargetChatIdRef: { current: string | undefined };
    readonly shareTargetIdRef: { current: string | undefined };
    readonly activeChatId: string | null;
    readonly activeMessages: ReadonlyArray<ChatMessage>;
    readonly isActiveChatReadOnly: boolean;
    readonly isActiveChatOptimistic: boolean;
    readonly isActiveBrowserTab: boolean;
    readonly isActiveChatStreamConnected: boolean;
    readonly agentName: string;
    readonly setFocusedChat: (
        focusedChat: { agentPermanentId: string; chatId: string; isChatFocused: boolean } | null,
    ) => void;
    readonly activeChatIdRef: { current: string | null };
    readonly applyChatDetail: ApplyAgentChatDetail;
    readonly refreshActiveChat: RefreshActiveChat;
    readonly syncActiveChatSelection: SyncActiveChatSelection;
    readonly failedSendByChatIdRef: { current: Map<string, Map<string, string>> };
    readonly pendingOptimisticChatCreationsRef: { current: Map<string, Promise<UserChatDetail>> };
    readonly resolvedOptimisticChatIdsRef: { current: Map<string, string> };
    readonly setChats: (chats: Array<UserChatSummary>) => void;
    readonly setIsActiveChatStreamConnected: (isConnected: boolean) => void;
    readonly setIsBootstrapping: (isBootstrapping: boolean) => void;
    readonly setIsChatListLoading: (isLoading: boolean) => void;
    readonly setIsActiveChatLoading: (isLoading: boolean) => void;
    readonly bootstrapChats: (preferredChatId?: string) => Promise<void>;
    readonly rejectInitialOptimisticChatBootstrap: (error: unknown) => void;
    readonly hasAnyActiveTimeouts: boolean;
    readonly setCurrentTimestamp: (timestamp: number) => void;
};

/**
 * Registers the side effects that keep durable chat history synchronized with the browser and server.
 *
 * @private function of useAgentChatHistoryClientState
 */
export function useAgentChatHistorySyncEffects({
    shouldUseHistory,
    initialChatId,
    initialForceNewChat,
    initialShareTargetId,
    autoExecuteTargetChatIdRef,
    shareTargetIdRef,
    activeChatId,
    activeMessages,
    isActiveChatReadOnly,
    isActiveChatOptimistic,
    isActiveBrowserTab,
    isActiveChatStreamConnected,
    agentName,
    setFocusedChat,
    activeChatIdRef,
    applyChatDetail,
    refreshActiveChat,
    syncActiveChatSelection,
    failedSendByChatIdRef,
    pendingOptimisticChatCreationsRef,
    resolvedOptimisticChatIdsRef,
    setChats,
    setIsActiveChatStreamConnected,
    setIsBootstrapping,
    setIsChatListLoading,
    setIsActiveChatLoading,
    bootstrapChats,
    rejectInitialOptimisticChatBootstrap,
    hasAnyActiveTimeouts,
    setCurrentTimestamp,
}: UseAgentChatHistorySyncEffectsProps): void {
    useEffect(() => {
        autoExecuteTargetChatIdRef.current = initialForceNewChat ? undefined : initialChatId;
    }, [autoExecuteTargetChatIdRef, initialChatId, initialForceNewChat]);

    useEffect(() => {
        shareTargetIdRef.current = initialShareTargetId;
    }, [initialShareTargetId, shareTargetIdRef]);

    useEffect(() => {
        if (!activeChatId) {
            return;
        }

        reconcilePendingOutboundMessages(activeChatId, activeMessages);
    }, [activeChatId, activeMessages]);

    useEffect(() => {
        syncFocusedChatRegistration({
            shouldUseHistory,
            activeChatId,
            isActiveChatReadOnly,
            isActiveChatOptimistic,
            isActiveBrowserTab,
            agentName,
            setFocusedChat,
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
        return bootstrapChatHistoryState({
            shouldUseHistory,
            setChats,
            syncActiveChatSelection,
            failedSendByChatIdRef,
            pendingOptimisticChatCreationsRef,
            resolvedOptimisticChatIdsRef,
            setIsActiveChatStreamConnected,
            setIsBootstrapping,
            setIsChatListLoading,
            setIsActiveChatLoading,
            bootstrapChats,
            initialChatId,
            rejectInitialOptimisticChatBootstrap,
        });
    }, [
        bootstrapChats,
        failedSendByChatIdRef,
        initialChatId,
        pendingOptimisticChatCreationsRef,
        rejectInitialOptimisticChatBootstrap,
        resolvedOptimisticChatIdsRef,
        setChats,
        setIsActiveChatLoading,
        setIsActiveChatStreamConnected,
        setIsBootstrapping,
        setIsChatListLoading,
        shouldUseHistory,
        syncActiveChatSelection,
    ]);

    useEffect(
        () => registerActiveTimeoutTicker(hasAnyActiveTimeouts, setCurrentTimestamp),
        [hasAnyActiveTimeouts, setCurrentTimestamp],
    );

    useEffect(
        () =>
            keepActiveChatStreamConnected({
                shouldUseHistory,
                activeChatId,
                isActiveChatReadOnly,
                isActiveChatOptimistic,
                isActiveBrowserTab,
                agentName,
                activeChatIdRef,
                setIsActiveChatStreamConnected,
                applyChatDetail,
                refreshActiveChat,
            }),
        [
            activeChatId,
            agentName,
            applyChatDetail,
            isActiveBrowserTab,
            isActiveChatOptimistic,
            isActiveChatReadOnly,
            refreshActiveChat,
            setIsActiveChatStreamConnected,
            shouldUseHistory,
            activeChatIdRef,
        ],
    );

    useEffect(
        () =>
            registerActiveChatRefreshPolling({
                shouldUseHistory,
                activeChatId,
                isActiveChatReadOnly,
                isActiveChatOptimistic,
                isActiveChatStreamConnected,
                refreshActiveChat,
            }),
        [
            activeChatId,
            isActiveChatOptimistic,
            isActiveChatReadOnly,
            isActiveChatStreamConnected,
            refreshActiveChat,
            shouldUseHistory,
        ],
    );
}

/**
 * Synchronizes push-notification focus with the currently selected chat.
 *
 * @private function of useAgentChatHistoryClientState
 */
function syncFocusedChatRegistration(params: {
    shouldUseHistory: boolean;
    activeChatId: string | null;
    isActiveChatReadOnly: boolean;
    isActiveChatOptimistic: boolean;
    isActiveBrowserTab: boolean;
    agentName: string;
    setFocusedChat: (focusedChat: { agentPermanentId: string; chatId: string; isChatFocused: boolean } | null) => void;
}): void {
    const {
        shouldUseHistory,
        activeChatId,
        isActiveChatReadOnly,
        isActiveChatOptimistic,
        isActiveBrowserTab,
        agentName,
        setFocusedChat,
    } = params;

    if (!shouldUseHistory || !activeChatId || isActiveChatReadOnly || isActiveChatOptimistic || !isActiveBrowserTab) {
        setFocusedChat(null);
        return;
    }

    setFocusedChat({
        agentPermanentId: agentName,
        chatId: activeChatId,
        isChatFocused: true,
    });
}

/**
 * Resets all history-specific state when durable history is disabled.
 *
 * @private function of useAgentChatHistoryClientState
 */
function resetChatHistoryState(params: {
    setChats: (chats: Array<UserChatSummary>) => void;
    syncActiveChatSelection: SyncActiveChatSelection;
    failedSendByChatIdRef: { current: Map<string, Map<string, string>> };
    pendingOptimisticChatCreationsRef: { current: Map<string, Promise<UserChatDetail>> };
    resolvedOptimisticChatIdsRef: { current: Map<string, string> };
    setIsActiveChatStreamConnected: (isConnected: boolean) => void;
    setIsBootstrapping: (isBootstrapping: boolean) => void;
    setIsChatListLoading: (isLoading: boolean) => void;
    setIsActiveChatLoading: (isLoading: boolean) => void;
}): void {
    const {
        setChats,
        syncActiveChatSelection,
        failedSendByChatIdRef,
        pendingOptimisticChatCreationsRef,
        resolvedOptimisticChatIdsRef,
        setIsActiveChatStreamConnected,
        setIsBootstrapping,
        setIsChatListLoading,
        setIsActiveChatLoading,
    } = params;

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
}

/**
 * Bootstraps durable chat history on mount and reports bootstrap failures.
 *
 * @private function of useAgentChatHistoryClientState
 */
function bootstrapChatHistoryState(params: {
    shouldUseHistory: boolean;
    setChats: (chats: Array<UserChatSummary>) => void;
    syncActiveChatSelection: SyncActiveChatSelection;
    failedSendByChatIdRef: { current: Map<string, Map<string, string>> };
    pendingOptimisticChatCreationsRef: { current: Map<string, Promise<UserChatDetail>> };
    resolvedOptimisticChatIdsRef: { current: Map<string, string> };
    setIsActiveChatStreamConnected: (isConnected: boolean) => void;
    setIsBootstrapping: (isBootstrapping: boolean) => void;
    setIsChatListLoading: (isLoading: boolean) => void;
    setIsActiveChatLoading: (isLoading: boolean) => void;
    bootstrapChats: (preferredChatId?: string) => Promise<void>;
    initialChatId?: string;
    rejectInitialOptimisticChatBootstrap: (error: unknown) => void;
}): (() => void) | undefined {
    const {
        shouldUseHistory,
        setChats,
        syncActiveChatSelection,
        failedSendByChatIdRef,
        pendingOptimisticChatCreationsRef,
        resolvedOptimisticChatIdsRef,
        setIsActiveChatStreamConnected,
        setIsBootstrapping,
        setIsChatListLoading,
        setIsActiveChatLoading,
        bootstrapChats,
        initialChatId,
        rejectInitialOptimisticChatBootstrap,
    } = params;

    if (!shouldUseHistory) {
        resetChatHistoryState({
            setChats,
            syncActiveChatSelection,
            failedSendByChatIdRef,
            pendingOptimisticChatCreationsRef,
            resolvedOptimisticChatIdsRef,
            setIsActiveChatStreamConnected,
            setIsBootstrapping,
            setIsChatListLoading,
            setIsActiveChatLoading,
        });
        return undefined;
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
                notifyError(resolveAgentChatHistoryErrorMessage(error, 'Failed to load chats.'));
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
}

/**
 * Keeps the timeout timestamps current while any chat has active timeouts.
 *
 * @private function of useAgentChatHistoryClientState
 */
function registerActiveTimeoutTicker(
    hasAnyActiveTimeouts: boolean,
    setCurrentTimestamp: (timestamp: number) => void,
): (() => void) | undefined {
    if (!hasAnyActiveTimeouts) {
        return undefined;
    }

    const interval = window.setInterval(() => {
        setCurrentTimestamp(Date.now());
    }, 1_000);

    return () => {
        window.clearInterval(interval);
    };
}

/**
 * Keeps the active durable chat stream connected while the current chat stays selected.
 *
 * @private function of useAgentChatHistoryClientState
 */
function keepActiveChatStreamConnected(params: {
    shouldUseHistory: boolean;
    activeChatId: string | null;
    isActiveChatReadOnly: boolean;
    isActiveChatOptimistic: boolean;
    isActiveBrowserTab: boolean;
    agentName: string;
    activeChatIdRef: { current: string | null };
    setIsActiveChatStreamConnected: (isConnected: boolean) => void;
    applyChatDetail: ApplyAgentChatDetail;
    refreshActiveChat: RefreshActiveChat;
}): (() => void) | undefined {
    const {
        shouldUseHistory,
        activeChatId,
        isActiveChatReadOnly,
        isActiveChatOptimistic,
        isActiveBrowserTab,
        agentName,
        activeChatIdRef,
        setIsActiveChatStreamConnected,
        applyChatDetail,
        refreshActiveChat,
    } = params;

    if (!shouldUseHistory || !activeChatId || isActiveChatReadOnly || isActiveChatOptimistic || !isActiveBrowserTab) {
        setIsActiveChatStreamConnected(false);
        return undefined;
    }

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isDisposed = false;
    const abortController = new AbortController();

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
}

/**
 * Refreshes the selected chat periodically and on tab visibility/focus changes.
 *
 * @private function of useAgentChatHistoryClientState
 */
function registerActiveChatRefreshPolling(params: {
    shouldUseHistory: boolean;
    activeChatId: string | null;
    isActiveChatReadOnly: boolean;
    isActiveChatOptimistic: boolean;
    isActiveChatStreamConnected: boolean;
    refreshActiveChat: RefreshActiveChat;
}): (() => void) | undefined {
    const {
        shouldUseHistory,
        activeChatId,
        isActiveChatReadOnly,
        isActiveChatOptimistic,
        isActiveChatStreamConnected,
        refreshActiveChat,
    } = params;

    if (!shouldUseHistory || !activeChatId || isActiveChatReadOnly || isActiveChatOptimistic) {
        return undefined;
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
}
