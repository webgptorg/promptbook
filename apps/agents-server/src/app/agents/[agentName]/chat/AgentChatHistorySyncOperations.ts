import { showConfirm } from '../../../../components/AsyncDialogs/asyncDialogs';
import { notifyError } from '../../../../components/Notifications/notifications';
import {
    createUserChat,
    removeUserChat,
    type UserChatDetail,
    type UserChatEnqueueResult,
    type UserChatSummary,
} from '../../../../utils/userChatClient';
import { AgentChatHistoryPayloadState } from './AgentChatHistoryPayloadState';
import { resolveAgentChatHistoryErrorMessage } from './resolveAgentChatHistoryErrorMessage';
import {
    AgentChatHistoryOptimisticState,
    type InitialOptimisticChatBootstrap,
} from './useAgentChatHistoryOptimisticState';
import { clearPendingOutboundMessages } from './usePendingOutboundMessages';
import type {
    ApplyAgentChatDetail,
    ApplyAgentChatPayloadOptions,
    ChatSelectionIntent,
    FetchChatSnapshot,
    LogChatSelection,
    RefreshActiveChat,
    SyncActiveChatSelection,
    UserChatsSnapshot,
} from './useAgentChatHistorySyncState';

/**
 * Async operations shared by the durable chat-history synchronization shell.
 *
 * @private function of useAgentChatHistoryClientState
 */
export const AgentChatHistorySyncOperations = {
    createBootstrapChatFromSnapshot,
    bootstrapChatSelection,
    refreshSelectedChat,
    openSelectedChat,
    createAndSelectOptimisticChat,
    deleteChatAndRefresh,
    cancelSelectedChatResource,
};

/**
 * Creates the bootstrap chat when the first render must start from a fresh canonical conversation.
 *
 * @private function of useAgentChatHistoryClientState
 */
async function createBootstrapChatFromSnapshot(params: {
    agentName: string;
    snapshot: UserChatsSnapshot;
    intentSequence: number;
    resolveInitialOptimisticChatBootstrap: (createdChat: UserChatDetail) => void;
    hasInitialAutoExecutePayload: boolean;
    hasInitialAutoMessageBeenConsumedRef: { current: boolean };
    autoExecuteTargetChatIdRef: { current: string | undefined };
    applyChatDetail: ApplyAgentChatDetail;
    initialOptimisticChatBootstrapRef: { current: InitialOptimisticChatBootstrap | null };
    setChats: (chats: Array<UserChatSummary>) => void;
}): Promise<void> {
    const {
        agentName,
        snapshot,
        intentSequence,
        resolveInitialOptimisticChatBootstrap,
        hasInitialAutoExecutePayload,
        hasInitialAutoMessageBeenConsumedRef,
        autoExecuteTargetChatIdRef,
        applyChatDetail,
        initialOptimisticChatBootstrapRef,
        setChats,
    } = params;

    const createdChat = await createUserChat(agentName);
    resolveInitialOptimisticChatBootstrap(createdChat);
    if (hasInitialAutoExecutePayload) {
        autoExecuteTargetChatIdRef.current = createdChat.chat.id;
    }

    applyChatDetail(createdChat, {
        allowSelectionAdoption: true,
        includeInitialMessage: !hasInitialAutoMessageBeenConsumedRef.current && hasInitialAutoExecutePayload,
        intentSequence,
        reason: 'bootstrap_create_chat',
    });
    const currentInitialOptimisticChatBootstrap = initialOptimisticChatBootstrapRef.current;
    setChats(
        currentInitialOptimisticChatBootstrap
            ? AgentChatHistoryOptimisticState.replaceOptimisticChatWithCanonicalChat(
                  snapshot.chats,
                  currentInitialOptimisticChatBootstrap.optimisticChatId,
                  createdChat.chat,
              )
            : [createdChat.chat, ...snapshot.chats.filter((chat) => chat.id !== createdChat.chat.id)],
    );
}

/**
 * Resolves the initial durable history selection by loading a snapshot or creating a fresh chat.
 *
 * @private function of useAgentChatHistoryClientState
 */
async function bootstrapChatSelection(params: {
    preferredChatId?: string;
    initialForceNewChat: boolean;
    issueSelectionIntent: (kind: ChatSelectionIntent['kind'], targetChatId: string | null) => number;
    logChatSelection: LogChatSelection;
    fetchChatSnapshot: FetchChatSnapshot;
    hasInitialAutoExecutePayload: boolean;
    hasInitialAutoMessageBeenConsumedRef: { current: boolean };
    initialOptimisticChatBootstrapRef: { current: InitialOptimisticChatBootstrap | null };
    createBootstrapChat: (snapshot: UserChatsSnapshot, intentSequence: number) => Promise<void>;
    applySnapshot: (snapshot: UserChatsSnapshot, options?: ApplyAgentChatPayloadOptions) => boolean;
    autoExecuteTargetChatIdRef: { current: string | undefined };
}): Promise<void> {
    const {
        preferredChatId,
        initialForceNewChat,
        issueSelectionIntent,
        logChatSelection,
        fetchChatSnapshot,
        hasInitialAutoExecutePayload,
        hasInitialAutoMessageBeenConsumedRef,
        initialOptimisticChatBootstrapRef,
        createBootstrapChat,
        applySnapshot,
        autoExecuteTargetChatIdRef,
    } = params;

    const effectivePreferredChatId = initialForceNewChat ? undefined : preferredChatId;
    const intentSequence = issueSelectionIntent('BOOTSTRAP', effectivePreferredChatId || null);
    logChatSelection('bootstrap_start', {
        preferredChatId: effectivePreferredChatId || null,
        intentSequence,
    });
    const snapshot = await fetchChatSnapshot(effectivePreferredChatId);
    if (
        shouldBootstrapCreateFreshChat({
            initialForceNewChat,
            hasInitialAutoExecutePayload,
            effectivePreferredChatId,
            snapshotActiveChatId: snapshot.activeChatId,
            hasInitialAutoMessageBeenConsumed: hasInitialAutoMessageBeenConsumedRef.current,
            hasInitialOptimisticChatBootstrap: Boolean(initialOptimisticChatBootstrapRef.current),
        })
    ) {
        await createBootstrapChat(snapshot, intentSequence);
        return;
    }

    const snapshotActiveChatId = snapshot.activeChatId;
    if (!snapshotActiveChatId) {
        return;
    }

    applySnapshot(snapshot, {
        allowSelectionAdoption: true,
        expectedChatId: effectivePreferredChatId,
        includeInitialMessage: shouldKeepBootstrapInitialMessage({
            hasInitialAutoExecutePayload,
            hasInitialAutoMessageBeenConsumed: hasInitialAutoMessageBeenConsumedRef.current,
            autoExecuteTargetChatId: autoExecuteTargetChatIdRef.current,
            snapshotActiveChatId,
        }),
        intentSequence,
        reason: 'bootstrap_snapshot',
    });
}

/**
 * Refreshes the currently selected durable chat when it can be safely reloaded from the server.
 *
 * @private function of useAgentChatHistoryClientState
 */
async function refreshSelectedChat(params: {
    shouldUseHistory: boolean;
    options: { preserveDirtyDraft?: boolean };
    activeChatIdRef: { current: string | null };
    isRefreshingRef: { current: boolean };
    fetchChatSnapshot: FetchChatSnapshot;
    logChatSelection: LogChatSelection;
    bootstrapChats: (preferredChatId?: string) => Promise<void>;
    applySnapshot: (snapshot: UserChatsSnapshot, options?: ApplyAgentChatPayloadOptions) => boolean;
}): Promise<void> {
    const {
        shouldUseHistory,
        options,
        activeChatIdRef,
        isRefreshingRef,
        fetchChatSnapshot,
        logChatSelection,
        bootstrapChats,
        applySnapshot,
    } = params;

    const currentActiveChatId = activeChatIdRef.current;
    if (
        !shouldUseHistory ||
        !currentActiveChatId ||
        AgentChatHistoryOptimisticState.isOptimisticChatId(currentActiveChatId) ||
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
}

/**
 * Opens one sidebar-selected chat after flushing the active draft and validating the selection intent.
 *
 * @private function of useAgentChatHistoryClientState
 */
async function openSelectedChat(params: {
    chatId: string;
    activeChatIdRef: { current: string | null };
    isActiveChatLoading: boolean;
    issueSelectionIntent: (kind: ChatSelectionIntent['kind'], targetChatId: string | null) => number;
    logChatSelection: LogChatSelection;
    flushActiveDraft: (options?: { keepalive?: boolean }) => Promise<void>;
    isSelectionIntentCurrent: (sequence: number) => boolean;
    setIsActiveChatLoading: (isLoading: boolean) => void;
    syncActiveChatSelection: SyncActiveChatSelection;
    fetchChatSnapshot: FetchChatSnapshot;
    applySnapshot: (snapshot: UserChatsSnapshot, options?: ApplyAgentChatPayloadOptions) => boolean;
}): Promise<void> {
    const {
        chatId,
        activeChatIdRef,
        isActiveChatLoading,
        issueSelectionIntent,
        logChatSelection,
        flushActiveDraft,
        isSelectionIntentCurrent,
        setIsActiveChatLoading,
        syncActiveChatSelection,
        fetchChatSnapshot,
        applySnapshot,
    } = params;

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
        notifyError(resolveAgentChatHistoryErrorMessage(error, 'Failed to open chat.'));
    }
}

/**
 * Creates one optimistic chat entry, promotes it to the canonical chat, and rolls back on failure.
 *
 * @private function of useAgentChatHistoryClientState
 */
async function createAndSelectOptimisticChat(params: {
    agentName: string;
    isCreatingChat: boolean;
    activeChatIdRef: { current: string | null };
    issueSelectionIntent: (kind: ChatSelectionIntent['kind'], targetChatId: string | null) => number;
    logChatSelection: LogChatSelection;
    flushActiveDraft: (options?: { keepalive?: boolean }) => Promise<void>;
    setChats: (updater: (previousChats: Array<UserChatSummary>) => Array<UserChatSummary>) => void;
    syncActiveChatSelection: SyncActiveChatSelection;
    pendingOptimisticChatCreationsRef: { current: Map<string, Promise<UserChatDetail>> };
    setIsCreatingChat: (isCreatingChat: boolean) => void;
    applyChatDetail: ApplyAgentChatDetail;
    resolvedOptimisticChatIdsRef: { current: Map<string, string> };
    reassignFailedSendRecordsToChatId: (fromChatId: string, toChatId: string) => void;
    clearFailedSendRecordsForChat: (chatId: string) => void;
    setIsActiveChatLoading: (isLoading: boolean) => void;
    bootstrapChats: (preferredChatId?: string) => Promise<void>;
}): Promise<void> {
    const {
        agentName,
        isCreatingChat,
        activeChatIdRef,
        issueSelectionIntent,
        logChatSelection,
        flushActiveDraft,
        setChats,
        syncActiveChatSelection,
        pendingOptimisticChatCreationsRef,
        setIsCreatingChat,
        applyChatDetail,
        resolvedOptimisticChatIdsRef,
        reassignFailedSendRecordsToChatId,
        clearFailedSendRecordsForChat,
        setIsActiveChatLoading,
        bootstrapChats,
    } = params;

    if (isCreatingChat) {
        return;
    }

    const previousActiveChatId = activeChatIdRef.current;
    const optimisticChatId = AgentChatHistoryOptimisticState.createOptimisticChatId();
    const optimisticChat = AgentChatHistoryOptimisticState.createOptimisticUserChatSummary(
        optimisticChatId,
        new Date().toISOString(),
    );
    const intentSequence = issueSelectionIntent('NEW_CHAT', optimisticChatId);
    logChatSelection('new_chat_click', {
        intentSequence,
        optimisticChatId,
    });

    const flushDraftPromise = flushActiveDraft().catch(() => undefined);
    setChats((previousChats) => AgentChatHistoryPayloadState.replaceChatInList(previousChats, optimisticChat));
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
        AgentChatHistoryOptimisticState.finalizeCreatedOptimisticChat({
            optimisticChatId,
            createdChat,
            intentSequence,
            pendingOptimisticChatCreationsRef,
            resolvedOptimisticChatIdsRef,
            reassignFailedSendRecordsToChatId,
            setChats,
            logChatSelection,
            applyChatDetail,
        });
    } catch (error) {
        await AgentChatHistoryOptimisticState.rollbackCreatedOptimisticChat({
            optimisticChatId,
            previousActiveChatId,
            activeChatIdRef,
            pendingOptimisticChatCreationsRef,
            resolvedOptimisticChatIdsRef,
            clearFailedSendRecordsForChat,
            setChats,
            setIsActiveChatLoading,
            bootstrapChats,
        });

        logChatSelection('create_chat_fail', {
            intentSequence,
            optimisticChatId,
            error: error instanceof Error ? error.message : String(error),
        });
        notifyError(resolveAgentChatHistoryErrorMessage(error, 'Failed to create chat.'));
    } finally {
        setIsCreatingChat(false);
    }
}

/**
 * Deletes one chat, clears optimistic bookkeeping, and refreshes the active selection when needed.
 *
 * @private function of useAgentChatHistoryClientState
 */
async function deleteChatAndRefresh(params: {
    agentName: string;
    chatId: string;
    formatText: (text: string) => string;
    setIsChatListLoading: (isLoading: boolean) => void;
    clearFailedSendRecordsForChat: (chatId: string) => void;
    pendingOptimisticChatCreationsRef: { current: Map<string, Promise<UserChatDetail>> };
    resolvedOptimisticChatIdsRef: { current: Map<string, string> };
    activeChatIdRef: { current: string | null };
    issueSelectionIntent: (kind: ChatSelectionIntent['kind'], targetChatId: string | null) => number;
    setIsActiveChatLoading: (isLoading: boolean) => void;
    bootstrapChats: (preferredChatId?: string) => Promise<void>;
    refreshActiveChat: RefreshActiveChat;
}): Promise<void> {
    const {
        agentName,
        chatId,
        formatText,
        setIsChatListLoading,
        clearFailedSendRecordsForChat,
        pendingOptimisticChatCreationsRef,
        resolvedOptimisticChatIdsRef,
        activeChatIdRef,
        issueSelectionIntent,
        setIsActiveChatLoading,
        bootstrapChats,
        refreshActiveChat,
    } = params;

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
        notifyError(resolveAgentChatHistoryErrorMessage(error, 'Failed to delete chat.'));
    } finally {
        setIsChatListLoading(false);
    }
}

/**
 * Cancels one active job or timeout for the currently selected chat.
 *
 * @private function of useAgentChatHistoryClientState
 */
async function cancelSelectedChatResource(params: {
    resourceId: string;
    activeChatIdRef: { current: string | null };
    cancelResource: (chatId: string, resourceId: string) => Promise<UserChatDetail | UserChatEnqueueResult>;
    applyChatDetail: ApplyAgentChatDetail;
    reason: string;
}): Promise<void> {
    const { resourceId, activeChatIdRef, cancelResource, applyChatDetail, reason } = params;
    const currentActiveChatId = activeChatIdRef.current;
    if (!currentActiveChatId) {
        return;
    }

    const chatDetail = await cancelResource(currentActiveChatId, resourceId);
    applyChatDetail(chatDetail, {
        expectedChatId: currentActiveChatId,
        preserveDirtyDraft: true,
        reason,
    });
}

/**
 * Returns true when bootstrap must create a fresh chat before the first renderable turn.
 *
 * @private function of useAgentChatHistoryClientState
 */
function shouldBootstrapCreateFreshChat(params: {
    initialForceNewChat: boolean;
    hasInitialAutoExecutePayload: boolean;
    effectivePreferredChatId?: string;
    snapshotActiveChatId: string | null;
    hasInitialAutoMessageBeenConsumed: boolean;
    hasInitialOptimisticChatBootstrap: boolean;
}): boolean {
    const {
        initialForceNewChat,
        hasInitialAutoExecutePayload,
        effectivePreferredChatId,
        snapshotActiveChatId,
        hasInitialAutoMessageBeenConsumed,
        hasInitialOptimisticChatBootstrap,
    } = params;

    return (
        initialForceNewChat ||
        !snapshotActiveChatId ||
        (hasInitialAutoExecutePayload &&
            (hasInitialOptimisticChatBootstrap || !hasInitialAutoMessageBeenConsumed) &&
            (initialForceNewChat || !effectivePreferredChatId))
    );
}

/**
 * Returns true when bootstrap should preserve the initial auto-execute payload on the current snapshot.
 *
 * @private function of useAgentChatHistoryClientState
 */
function shouldKeepBootstrapInitialMessage(params: {
    hasInitialAutoExecutePayload: boolean;
    hasInitialAutoMessageBeenConsumed: boolean;
    autoExecuteTargetChatId?: string;
    snapshotActiveChatId: string;
}): boolean {
    const {
        hasInitialAutoExecutePayload,
        hasInitialAutoMessageBeenConsumed,
        autoExecuteTargetChatId,
        snapshotActiveChatId,
    } = params;

    return (
        !hasInitialAutoMessageBeenConsumed &&
        hasInitialAutoExecutePayload &&
        (!autoExecuteTargetChatId || autoExecuteTargetChatId === snapshotActiveChatId)
    );
}
