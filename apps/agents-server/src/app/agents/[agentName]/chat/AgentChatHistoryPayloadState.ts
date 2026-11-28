import type { ChatMessage } from '@promptbook-local/types';
import type {
    UserChatDetail,
    UserChatEnqueueResult,
    UserChatJob,
    UserChatSummary,
    UserChatTimeout,
} from '../../../../utils/userChatClient';
import type {
    ApplyAgentChatPayloadOptions,
    ChatSelectionIntent,
    LogChatSelection,
    SyncActiveChatSelection,
    UserChatsSnapshot,
} from './useAgentChatHistorySyncState';

/**
 * Validation result describing whether one resolved chat payload should update the active selection.
 *
 * @private function of useAgentChatHistoryClientState
 */
type ChatPayloadValidationResult = {
    shouldApplyPayload: boolean;
    shouldUpdateChatList: boolean;
};

/**
 * Pure payload-application helpers for durable chat-history synchronization.
 *
 * @private function of useAgentChatHistoryClientState
 */
export const AgentChatHistoryPayloadState = {
    applyChatDetailStateUpdate,
    applySnapshotStateUpdate,
    clearActiveChatRuntimeState,
    replaceChatInList,
    sortUserChatSummariesByTimeDescending,
};

/**
 * Applies one resolved chat detail payload after validating the current selection intent.
 *
 * @private function of useAgentChatHistoryClientState
 */
function applyChatDetailStateUpdate(params: {
    chatDetail: UserChatDetail | UserChatEnqueueResult;
    options: ApplyAgentChatPayloadOptions;
    activeChatIdRef: { current: string | null };
    selectionIntentRef: { current: ChatSelectionIntent };
    isSelectionIntentCurrent: (sequence: number) => boolean;
    isEquivalentSelectedChat: (selectedChatId: string | null, resolvedChatId: string) => boolean;
    logChatSelection: LogChatSelection;
    setChats: (updater: (previousChats: Array<UserChatSummary>) => Array<UserChatSummary>) => void;
    syncActiveChatSelection: SyncActiveChatSelection;
    activeDraftDirtyRef: { current: boolean };
    isActiveDraftUserOwnedRef: { current: boolean };
    setActiveMessages: (messages: Array<ChatMessage>) => void;
    setActiveJobs: (jobs: Array<UserChatJob>) => void;
    setActiveTimeouts: (timeouts: Array<UserChatTimeout>) => void;
    setActiveChatDraftMessage: (draftMessage: string) => void;
    setIsActiveChatLoading: (isLoading: boolean) => void;
}): boolean {
    const {
        chatDetail,
        options,
        activeChatIdRef,
        selectionIntentRef,
        isSelectionIntentCurrent,
        isEquivalentSelectedChat,
        logChatSelection,
        setChats,
        syncActiveChatSelection,
        activeDraftDirtyRef,
        isActiveDraftUserOwnedRef,
        setActiveMessages,
        setActiveJobs,
        setActiveTimeouts,
        setActiveChatDraftMessage,
        setIsActiveChatLoading,
    } = params;

    const reason = options.reason || 'detail-update';
    const resolvedChatId = chatDetail.chat.id;
    const currentSelectedChatId = activeChatIdRef.current;
    const validationResult = validateChatPayloadSelection({
        allowSelectionAdoption: options.allowSelectionAdoption,
        currentSelectedChatId,
        expectedChatId: options.expectedChatId,
        intentSequence: options.intentSequence,
        currentIntentSequence: selectionIntentRef.current.sequence,
        resolvedChatId,
        reason,
        staleEvent: 'selection_skip_detail_stale_intent',
        mismatchEvent: 'selection_skip_detail_chat_mismatch',
        selectionMismatchEvent: 'selection_skip_detail_selection_mismatch',
        isSelectionIntentCurrent,
        isEquivalentSelectedChat,
        logChatSelection,
        shouldUpdateChatListOnSelectionMismatch: true,
    });

    if (validationResult.shouldUpdateChatList) {
        setChats((previousChats) => replaceChatInList(previousChats, chatDetail.chat));
    }

    if (!validationResult.shouldApplyPayload) {
        return false;
    }

    applyResolvedChatPayload({
        resolvedChatId,
        nextMessages: chatDetail.messages,
        nextActiveJobs: chatDetail.activeJobs,
        nextActiveTimeouts: chatDetail.activeTimeouts,
        nextDraftMessage: chatDetail.draftMessage,
        currentSelectedChatId,
        preserveDirtyDraft: options.preserveDirtyDraft,
        includeInitialMessage: options.includeInitialMessage,
        reason,
        appliedEvent: 'selection_apply_detail',
        syncActiveChatSelection,
        isEquivalentSelectedChat,
        activeDraftDirtyRef,
        isActiveDraftUserOwnedRef,
        setActiveMessages,
        setActiveJobs,
        setActiveTimeouts,
        setActiveChatDraftMessage,
        setIsActiveChatLoading,
        logChatSelection,
    });

    return true;
}

/**
 * Applies one fetched chat snapshot after validating the current selection intent.
 *
 * @private function of useAgentChatHistoryClientState
 */
function applySnapshotStateUpdate(params: {
    snapshot: UserChatsSnapshot;
    options: ApplyAgentChatPayloadOptions;
    activeChatIdRef: { current: string | null };
    selectionIntentRef: { current: ChatSelectionIntent };
    isSelectionIntentCurrent: (sequence: number) => boolean;
    isEquivalentSelectedChat: (selectedChatId: string | null, resolvedChatId: string) => boolean;
    logChatSelection: LogChatSelection;
    setChats: (chats: Array<UserChatSummary>) => void;
    syncActiveChatSelection: SyncActiveChatSelection;
    activeDraftDirtyRef: { current: boolean };
    isActiveDraftUserOwnedRef: { current: boolean };
    setActiveMessages: (messages: Array<ChatMessage>) => void;
    setActiveJobs: (jobs: Array<UserChatJob>) => void;
    setActiveTimeouts: (timeouts: Array<UserChatTimeout>) => void;
    setActiveChatDraftMessage: (draftMessage: string) => void;
    setIsActiveChatLoading: (isLoading: boolean) => void;
}): boolean {
    const {
        snapshot,
        options,
        activeChatIdRef,
        selectionIntentRef,
        isSelectionIntentCurrent,
        isEquivalentSelectedChat,
        logChatSelection,
        setChats,
        syncActiveChatSelection,
        activeDraftDirtyRef,
        isActiveDraftUserOwnedRef,
        setActiveMessages,
        setActiveJobs,
        setActiveTimeouts,
        setActiveChatDraftMessage,
        setIsActiveChatLoading,
    } = params;

    const reason = options.reason || 'snapshot-update';
    setChats(sortUserChatSummariesByTimeDescending(snapshot.chats));
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

    const currentSelectedChatId = activeChatIdRef.current;
    const validationResult = validateChatPayloadSelection({
        allowSelectionAdoption: options.allowSelectionAdoption,
        currentSelectedChatId,
        expectedChatId: options.expectedChatId,
        intentSequence: options.intentSequence,
        currentIntentSequence: selectionIntentRef.current.sequence,
        resolvedChatId: snapshot.activeChatId,
        reason,
        staleEvent: 'selection_skip_snapshot_stale_intent',
        mismatchEvent: 'selection_skip_snapshot_chat_mismatch',
        selectionMismatchEvent: 'selection_skip_snapshot_selection_mismatch',
        isSelectionIntentCurrent,
        isEquivalentSelectedChat,
        logChatSelection,
        shouldUpdateChatListOnSelectionMismatch: false,
    });

    if (!validationResult.shouldApplyPayload) {
        return false;
    }

    applyResolvedChatPayload({
        resolvedChatId: snapshot.activeChatId,
        nextMessages: snapshot.activeMessages,
        nextActiveJobs: snapshot.activeJobs,
        nextActiveTimeouts: snapshot.activeTimeouts,
        nextDraftMessage: snapshot.activeDraftMessage,
        currentSelectedChatId,
        preserveDirtyDraft: options.preserveDirtyDraft,
        includeInitialMessage: options.includeInitialMessage,
        reason,
        appliedEvent: 'selection_apply_snapshot',
        syncActiveChatSelection,
        isEquivalentSelectedChat,
        activeDraftDirtyRef,
        isActiveDraftUserOwnedRef,
        setActiveMessages,
        setActiveJobs,
        setActiveTimeouts,
        setActiveChatDraftMessage,
        setIsActiveChatLoading,
        logChatSelection,
    });

    return true;
}

/**
 * Clears the selected chat payload and resets local draft ownership markers.
 *
 * @private function of useAgentChatHistoryClientState
 */
function clearActiveChatRuntimeState(params: {
    setActiveMessages: (messages: Array<ChatMessage>) => void;
    setActiveJobs: (jobs: Array<UserChatJob>) => void;
    setActiveTimeouts: (timeouts: Array<UserChatTimeout>) => void;
    setActiveChatDraftMessage: (draftMessage: string) => void;
    activeDraftDirtyRef: { current: boolean };
    isActiveDraftUserOwnedRef: { current: boolean };
}): void {
    const {
        setActiveMessages,
        setActiveJobs,
        setActiveTimeouts,
        setActiveChatDraftMessage,
        activeDraftDirtyRef,
        isActiveDraftUserOwnedRef,
    } = params;

    setActiveMessages([]);
    setActiveJobs([]);
    setActiveTimeouts([]);
    setActiveChatDraftMessage('');
    activeDraftDirtyRef.current = false;
    isActiveDraftUserOwnedRef.current = false;
}

/**
 * Returns true when the local unsaved draft should win over an incoming server payload.
 *
 * @private function of useAgentChatHistoryClientState
 */
function shouldPreserveUserOwnedDraft(params: {
    preserveDirtyDraft?: boolean;
    currentSelectedChatId: string | null;
    resolvedChatId: string;
    isActiveDraftUserOwned: boolean;
    isEquivalentSelectedChat: (selectedChatId: string | null, resolvedChatId: string) => boolean;
}): boolean {
    const {
        preserveDirtyDraft,
        currentSelectedChatId,
        resolvedChatId,
        isActiveDraftUserOwned,
        isEquivalentSelectedChat,
    } = params;

    return (
        preserveDirtyDraft === true &&
        isActiveDraftUserOwned &&
        isEquivalentSelectedChat(currentSelectedChatId, resolvedChatId)
    );
}

/**
 * Applies the next draft message unless a user-owned draft must be preserved.
 *
 * @private function of useAgentChatHistoryClientState
 */
function applyResolvedDraftMessage(params: {
    nextDraftMessage: string | null | undefined;
    preserveDirtyDraft?: boolean;
    currentSelectedChatId: string | null;
    resolvedChatId: string;
    isEquivalentSelectedChat: (selectedChatId: string | null, resolvedChatId: string) => boolean;
    activeDraftDirtyRef: { current: boolean };
    isActiveDraftUserOwnedRef: { current: boolean };
    setActiveChatDraftMessage: (draftMessage: string) => void;
}): void {
    const {
        nextDraftMessage,
        preserveDirtyDraft,
        currentSelectedChatId,
        resolvedChatId,
        isEquivalentSelectedChat,
        activeDraftDirtyRef,
        isActiveDraftUserOwnedRef,
        setActiveChatDraftMessage,
    } = params;

    if (
        shouldPreserveUserOwnedDraft({
            preserveDirtyDraft,
            currentSelectedChatId,
            resolvedChatId,
            isActiveDraftUserOwned: isActiveDraftUserOwnedRef.current,
            isEquivalentSelectedChat,
        })
    ) {
        return;
    }

    activeDraftDirtyRef.current = false;
    isActiveDraftUserOwnedRef.current = false;
    setActiveChatDraftMessage(nextDraftMessage || '');
}

/**
 * Consolidates selection-intent and resolved-chat applicability checks for incoming payloads.
 *
 * @private function of useAgentChatHistoryClientState
 */
function validateChatPayloadSelection(params: {
    allowSelectionAdoption?: boolean;
    currentSelectedChatId: string | null;
    expectedChatId?: string;
    intentSequence?: number;
    currentIntentSequence: number;
    resolvedChatId: string;
    reason: string;
    staleEvent: string;
    mismatchEvent: string;
    selectionMismatchEvent: string;
    isSelectionIntentCurrent: (sequence: number) => boolean;
    isEquivalentSelectedChat: (selectedChatId: string | null, resolvedChatId: string) => boolean;
    logChatSelection: LogChatSelection;
    shouldUpdateChatListOnSelectionMismatch: boolean;
}): ChatPayloadValidationResult {
    const {
        allowSelectionAdoption,
        currentSelectedChatId,
        expectedChatId,
        intentSequence,
        currentIntentSequence,
        resolvedChatId,
        reason,
        staleEvent,
        mismatchEvent,
        selectionMismatchEvent,
        isSelectionIntentCurrent,
        isEquivalentSelectedChat,
        logChatSelection,
        shouldUpdateChatListOnSelectionMismatch,
    } = params;

    if (
        isSelectionIntentStale({
            intentSequence,
            currentIntentSequence,
            expectedChatId: expectedChatId || null,
            resolvedChatId,
            reason,
            staleEvent,
            isSelectionIntentCurrent,
            logChatSelection,
        })
    ) {
        return {
            shouldApplyPayload: false,
            shouldUpdateChatList: false,
        };
    }

    if (
        isUnexpectedResolvedChatId({
            expectedChatId,
            resolvedChatId,
            reason,
            mismatchEvent,
            logChatSelection,
        })
    ) {
        return {
            shouldApplyPayload: false,
            shouldUpdateChatList: false,
        };
    }

    if (
        isSelectionMismatchForResolvedChat({
            allowSelectionAdoption,
            currentSelectedChatId,
            resolvedChatId,
            reason,
            mismatchEvent: selectionMismatchEvent,
            isEquivalentSelectedChat,
            logChatSelection,
        })
    ) {
        return {
            shouldApplyPayload: false,
            shouldUpdateChatList: shouldUpdateChatListOnSelectionMismatch,
        };
    }

    return {
        shouldApplyPayload: true,
        shouldUpdateChatList: true,
    };
}

/**
 * Returns true when a newer explicit selection intent already superseded the current payload.
 *
 * @private function of useAgentChatHistoryClientState
 */
function isSelectionIntentStale(params: {
    intentSequence?: number;
    currentIntentSequence: number;
    expectedChatId?: string | null;
    resolvedChatId: string;
    reason: string;
    staleEvent: string;
    isSelectionIntentCurrent: (sequence: number) => boolean;
    logChatSelection: LogChatSelection;
}): boolean {
    const {
        intentSequence,
        currentIntentSequence,
        expectedChatId,
        resolvedChatId,
        reason,
        staleEvent,
        isSelectionIntentCurrent,
        logChatSelection,
    } = params;

    if (intentSequence === undefined || isSelectionIntentCurrent(intentSequence)) {
        return false;
    }

    logChatSelection(staleEvent, {
        reason,
        expectedChatId: expectedChatId || null,
        resolvedChatId,
        intentSequence,
        currentIntentSequence,
    });

    return true;
}

/**
 * Returns true when the resolved chat id does not match the caller's expected target.
 *
 * @private function of useAgentChatHistoryClientState
 */
function isUnexpectedResolvedChatId(params: {
    expectedChatId?: string;
    resolvedChatId: string;
    reason: string;
    mismatchEvent: string;
    logChatSelection: LogChatSelection;
}): boolean {
    const { expectedChatId, resolvedChatId, reason, mismatchEvent, logChatSelection } = params;

    if (!expectedChatId || expectedChatId === resolvedChatId) {
        return false;
    }

    logChatSelection(mismatchEvent, {
        reason,
        expectedChatId,
        resolvedChatId,
    });

    return true;
}

/**
 * Returns true when a resolved payload no longer matches the currently selected chat.
 *
 * @private function of useAgentChatHistoryClientState
 */
function isSelectionMismatchForResolvedChat(params: {
    allowSelectionAdoption?: boolean;
    currentSelectedChatId: string | null;
    resolvedChatId: string;
    reason: string;
    mismatchEvent: string;
    isEquivalentSelectedChat: (selectedChatId: string | null, resolvedChatId: string) => boolean;
    logChatSelection: LogChatSelection;
}): boolean {
    const {
        allowSelectionAdoption,
        currentSelectedChatId,
        resolvedChatId,
        reason,
        mismatchEvent,
        isEquivalentSelectedChat,
        logChatSelection,
    } = params;

    if (allowSelectionAdoption === true || isEquivalentSelectedChat(currentSelectedChatId, resolvedChatId)) {
        return false;
    }

    logChatSelection(mismatchEvent, {
        reason,
        expectedChatId: currentSelectedChatId,
        resolvedChatId,
    });

    return true;
}

/**
 * Applies one resolved chat payload to the selected chat state.
 *
 * @private function of useAgentChatHistoryClientState
 */
function applyResolvedChatPayload(params: {
    resolvedChatId: string;
    nextMessages: ReadonlyArray<ChatMessage>;
    nextActiveJobs: ReadonlyArray<UserChatJob>;
    nextActiveTimeouts: ReadonlyArray<UserChatTimeout>;
    nextDraftMessage: string | null | undefined;
    currentSelectedChatId: string | null;
    preserveDirtyDraft?: boolean;
    includeInitialMessage?: boolean;
    reason: string;
    appliedEvent: string;
    syncActiveChatSelection: SyncActiveChatSelection;
    isEquivalentSelectedChat: (selectedChatId: string | null, resolvedChatId: string) => boolean;
    activeDraftDirtyRef: { current: boolean };
    isActiveDraftUserOwnedRef: { current: boolean };
    setActiveMessages: (messages: Array<ChatMessage>) => void;
    setActiveJobs: (jobs: Array<UserChatJob>) => void;
    setActiveTimeouts: (timeouts: Array<UserChatTimeout>) => void;
    setActiveChatDraftMessage: (draftMessage: string) => void;
    setIsActiveChatLoading: (isLoading: boolean) => void;
    logChatSelection: LogChatSelection;
}): void {
    const {
        resolvedChatId,
        nextMessages,
        nextActiveJobs,
        nextActiveTimeouts,
        nextDraftMessage,
        currentSelectedChatId,
        preserveDirtyDraft,
        includeInitialMessage,
        reason,
        appliedEvent,
        syncActiveChatSelection,
        isEquivalentSelectedChat,
        activeDraftDirtyRef,
        isActiveDraftUserOwnedRef,
        setActiveMessages,
        setActiveJobs,
        setActiveTimeouts,
        setActiveChatDraftMessage,
        setIsActiveChatLoading,
        logChatSelection,
    } = params;

    syncActiveChatSelection(resolvedChatId, {
        includeInitialMessage,
        reason,
    });
    setActiveMessages([...nextMessages]);
    setActiveJobs([...nextActiveJobs]);
    setActiveTimeouts([...nextActiveTimeouts]);
    applyResolvedDraftMessage({
        nextDraftMessage,
        preserveDirtyDraft,
        currentSelectedChatId,
        resolvedChatId,
        isEquivalentSelectedChat,
        activeDraftDirtyRef,
        isActiveDraftUserOwnedRef,
        setActiveChatDraftMessage,
    });
    setIsActiveChatLoading(false);

    logChatSelection(appliedEvent, {
        reason,
        chatId: resolvedChatId,
    });
}

/**
 * Inserts or updates one chat summary in the sidebar list while keeping the list ordered
 * by latest activity time (newest first), so the currently selected chat stays in its
 * chronological position instead of being hoisted to the top.
 *
 * @private function of useAgentChatHistoryClientState
 */
function replaceChatInList(chats: ReadonlyArray<UserChatSummary>, targetChat: UserChatSummary): Array<UserChatSummary> {
    const hasExistingEntry = chats.some((chat) => chat.id === targetChat.id);
    const updatedChats = hasExistingEntry
        ? chats.map((chat) => (chat.id === targetChat.id ? targetChat : chat))
        : [...chats, targetChat];
    return sortUserChatSummariesByTimeDescending(updatedChats);
}

/**
 * Resolves the timestamp used to order one chat summary in the sidebar tray.
 *
 * Prefers the latest message timestamp, falls back to the chat's last update time, and finally
 * to its creation time. This mirrors the timestamp displayed next to each chat row.
 *
 * @private function of useAgentChatHistoryClientState
 */
function resolveUserChatSummaryOrderTime(chat: UserChatSummary): number {
    const timestamp = chat.lastMessageAt || chat.updatedAt || chat.createdAt;
    const parsedTime = new Date(timestamp).getTime();
    return Number.isFinite(parsedTime) ? parsedTime : 0;
}

/**
 * Returns one new array of chat summaries sorted by latest activity time, newest first.
 *
 * @private function of useAgentChatHistoryClientState
 */
function sortUserChatSummariesByTimeDescending(
    chats: ReadonlyArray<UserChatSummary>,
): Array<UserChatSummary> {
    return [...chats].sort(
        (leftChat, rightChat) =>
            resolveUserChatSummaryOrderTime(rightChat) - resolveUserChatSummaryOrderTime(leftChat),
    );
}
