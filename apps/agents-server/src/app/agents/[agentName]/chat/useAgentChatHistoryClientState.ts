'use client';

import type { ChatMessage } from '@promptbook-local/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAgentNaming } from '../../../../components/AgentNaming/AgentNamingContext';
import { showConfirm } from '../../../../components/AsyncDialogs/asyncDialogs';
import { createMyChatsMobileMenuItem } from '../../../../components/Header/createMyChatsMobileMenuItem';
import { useHoistedMobileMenuItems } from '../../../../components/Header/MobileMenuHoistingContext';
import { notifyError, notifyInfo } from '../../../../components/Notifications/notifications';
import { usePrivateModePreferences } from '../../../../components/PrivateModePreferences/PrivateModePreferencesProvider';
import { useBrowserPushNotifications } from '../../../../components/PushNotifications/BrowserPushNotificationsProvider';
import { useServerLanguage } from '../../../../components/ServerLanguage/ServerLanguageProvider';
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
import { FORCE_NEW_CHAT_QUERY_VALUE } from '../agentChatNavigationUtils';
import { clearPendingProfileMessage, peekPendingProfileMessage } from '../profileMessageCache';
import { serializeReplyingToSignature } from './chatReplies';
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
 *
 * @private type of AgentChatHistoryClient
 */
export type AgentChatHistoryClientProps = {
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
 * Render-oriented state and handlers exposed by `useAgentChatHistoryClientState`.
 *
 * @private type of AgentChatHistoryClient
 */
type UseAgentChatHistoryClientStateResult = {
    formatText: (text: string) => string;
    shouldUseHistory: boolean;
    effectiveInitialAutoExecuteMessage: string | undefined;
    effectiveInitialAutoExecuteMessageAttachments: ChatMessage['attachments'] | undefined;
    chats: Array<UserChatSummary>;
    activeChatId: string | null;
    activeChatSummary: UserChatSummary | null;
    activeChatDraftMessage: string;
    activeJobs: Array<UserChatJob>;
    activeTimeouts: Array<UserChatTimeout>;
    renderedActiveMessages: Array<ChatMessage>;
    isChatListLoading: boolean;
    isActiveChatLoading: boolean;
    isActiveChatReadOnly: boolean;
    isSidebarCollapsed: boolean;
    shouldShowExternalChats: boolean;
    currentTimestamp: number;
    autoExecuteMessage: string | undefined;
    newChatHref: string;
    untitledChatTitle: string;
    formatChatTimestamp: (timestamp: string) => string;
    handleSelectChatFromSidebar: (chatId: string) => void;
    handleDeleteChat: (chatId: string) => Promise<void>;
    handleShowExternalChatsChange: (nextValue: boolean) => void;
    toggleSidebarCollapsed: () => void;
    closeMobileSidebar: () => void;
    handleDraftMessageChange: (draftMessage: string) => void;
    handleSubmitUserTurn: (payload: {
        message: string;
        attachments?: ChatMessage['attachments'];
        parameters?: Record<string, unknown>;
        clientMessageId?: string;
        replyingTo?: ChatMessage['replyingTo'];
    }) => Promise<void>;
    handleCancelActiveJob: (jobId: string) => Promise<void>;
    handleCancelActiveTimeout: (timeoutId: string) => Promise<void>;
    handleAutoExecuteMessagePending: (payload: {
        chatId: string;
        clientMessageId: string;
        message: string;
        attachments?: ChatMessage['attachments'];
    }) => void;
    handleAutoExecuteMessageConsumed: () => void;
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
 * Clears the selected chat payload and resets local draft ownership markers.
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
 * Returns true when a newer explicit selection intent already superseded the current payload.
 */
function isSelectionIntentStale(params: {
    intentSequence?: number;
    currentIntentSequence: number;
    expectedChatId?: string | null;
    resolvedChatId: string;
    reason: string;
    staleEvent: string;
    isSelectionIntentCurrent: (sequence: number) => boolean;
    logChatSelection: (event: string, payload?: Record<string, unknown>) => void;
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
 */
function isUnexpectedResolvedChatId(params: {
    expectedChatId?: string;
    resolvedChatId: string;
    reason: string;
    mismatchEvent: string;
    logChatSelection: (event: string, payload?: Record<string, unknown>) => void;
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
 */
function isSelectionMismatchForResolvedChat(params: {
    allowSelectionAdoption?: boolean;
    currentSelectedChatId: string | null;
    resolvedChatId: string;
    reason: string;
    mismatchEvent: string;
    isEquivalentSelectedChat: (selectedChatId: string | null, resolvedChatId: string) => boolean;
    logChatSelection: (event: string, payload?: Record<string, unknown>) => void;
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
    syncActiveChatSelection: (
        chatId: string | null,
        options: {
            clearChatContent?: boolean;
            includeInitialMessage?: boolean;
            reason: string;
        },
    ) => void;
    isEquivalentSelectedChat: (selectedChatId: string | null, resolvedChatId: string) => boolean;
    activeDraftDirtyRef: { current: boolean };
    isActiveDraftUserOwnedRef: { current: boolean };
    setActiveMessages: (messages: Array<ChatMessage>) => void;
    setActiveJobs: (jobs: Array<UserChatJob>) => void;
    setActiveTimeouts: (timeouts: Array<UserChatTimeout>) => void;
    setActiveChatDraftMessage: (draftMessage: string) => void;
    setIsActiveChatLoading: (isLoading: boolean) => void;
    logChatSelection: (event: string, payload?: Record<string, unknown>) => void;
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
 * Starts tracking direct user interaction with the main chat composer.
 */
function registerChatInputDraftOwnershipTracking(isActiveDraftUserOwnedRef: {
    current: boolean;
}): (() => void) | undefined {
    if (typeof document === 'undefined') {
        return undefined;
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
}

/**
 * Synchronizes push-notification focus with the currently selected chat.
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
 * Shows the default-off browser notification hint once a tracked assistant reply completes.
 */
function maybeShowNotificationsHint(params: {
    activeMessages: ReadonlyArray<ChatMessage>;
    pendingNotificationHintAssistantMessageIds: ReadonlyArray<string>;
    rememberDefaultOffHintShown: () => Promise<boolean>;
    setNotificationsEnabled: (isEnabled: boolean) => void;
    t: ReturnType<typeof useServerLanguage>['t'];
    clearPendingNotificationHintAssistantMessageIds: () => void;
}): (() => void) | undefined {
    const {
        activeMessages,
        pendingNotificationHintAssistantMessageIds,
        rememberDefaultOffHintShown,
        setNotificationsEnabled,
        t,
        clearPendingNotificationHintAssistantMessageIds,
    } = params;

    if (pendingNotificationHintAssistantMessageIds.length === 0) {
        return undefined;
    }

    const hasCompletedTrackedAssistantMessage = pendingNotificationHintAssistantMessageIds.some((assistantMessageId) =>
        activeMessages.some(
            (message) => message.id === assistantMessageId && message.sender !== 'USER' && message.isComplete !== false,
        ),
    );
    if (!hasCompletedTrackedAssistantMessage) {
        return undefined;
    }

    let isDisposed = false;
    clearPendingNotificationHintAssistantMessageIds();
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
}

/**
 * Resets all history-specific state when durable history is disabled.
 */
function resetChatHistoryState(params: {
    setChats: (chats: Array<UserChatSummary>) => void;
    syncActiveChatSelection: (
        chatId: string | null,
        options: {
            clearChatContent?: boolean;
            includeInitialMessage?: boolean;
            reason: string;
        },
    ) => void;
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
 */
function bootstrapChatHistoryState(params: {
    shouldUseHistory: boolean;
    setChats: (chats: Array<UserChatSummary>) => void;
    syncActiveChatSelection: (
        chatId: string | null,
        options: {
            clearChatContent?: boolean;
            includeInitialMessage?: boolean;
            reason: string;
        },
    ) => void;
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
}

/**
 * Keeps the timeout timestamps current while any chat has active timeouts.
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
 * Persists the active draft on page lifecycle transitions.
 */
function registerDraftFlushLifecycle(params: {
    shouldUseHistory: boolean;
    flushActiveDraft: (options?: { keepalive?: boolean }) => Promise<void>;
}): (() => void) | undefined {
    const { shouldUseHistory, flushActiveDraft } = params;

    if (!shouldUseHistory || typeof window === 'undefined') {
        return undefined;
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
}

/**
 * Keeps the active durable chat stream connected while the current chat stays selected.
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
    applyChatDetail: (
        chatDetail: UserChatDetail | UserChatEnqueueResult,
        options?: {
            allowSelectionAdoption?: boolean;
            expectedChatId?: string;
            intentSequence?: number;
            preserveDirtyDraft?: boolean;
            includeInitialMessage?: boolean;
            reason?: string;
        },
    ) => boolean;
    refreshActiveChat: (options?: { preserveDirtyDraft?: boolean }) => Promise<void>;
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
}

/**
 * Refreshes the selected chat periodically and on tab visibility/focus changes.
 */
function registerActiveChatRefreshPolling(params: {
    shouldUseHistory: boolean;
    activeChatId: string | null;
    isActiveChatReadOnly: boolean;
    isActiveChatOptimistic: boolean;
    isActiveChatStreamConnected: boolean;
    refreshActiveChat: (options?: { preserveDirtyDraft?: boolean }) => Promise<void>;
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

/**
 * Returns true when bootstrap must create a fresh chat before the first renderable turn.
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

/**
 * Finalizes a newly created optimistic chat with the canonical server result.
 */
function finalizeCreatedOptimisticChat(params: {
    optimisticChatId: string;
    createdChat: UserChatDetail;
    intentSequence: number;
    pendingOptimisticChatCreationsRef: { current: Map<string, Promise<UserChatDetail>> };
    resolvedOptimisticChatIdsRef: { current: Map<string, string> };
    reassignFailedSendRecordsToChatId: (fromChatId: string, toChatId: string) => void;
    setChats: (updater: (previousChats: Array<UserChatSummary>) => Array<UserChatSummary>) => void;
    logChatSelection: (event: string, payload?: Record<string, unknown>) => void;
    applyChatDetail: (
        chatDetail: UserChatDetail | UserChatEnqueueResult,
        options?: {
            allowSelectionAdoption?: boolean;
            expectedChatId?: string;
            intentSequence?: number;
            preserveDirtyDraft?: boolean;
            includeInitialMessage?: boolean;
            reason?: string;
        },
    ) => boolean;
}): void {
    const {
        optimisticChatId,
        createdChat,
        intentSequence,
        pendingOptimisticChatCreationsRef,
        resolvedOptimisticChatIdsRef,
        reassignFailedSendRecordsToChatId,
        setChats,
        logChatSelection,
        applyChatDetail,
    } = params;

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
}

/**
 * Rolls back a failed optimistic chat creation attempt.
 */
async function rollbackCreatedOptimisticChat(params: {
    optimisticChatId: string;
    previousActiveChatId: string | null;
    activeChatIdRef: { current: string | null };
    pendingOptimisticChatCreationsRef: { current: Map<string, Promise<UserChatDetail>> };
    resolvedOptimisticChatIdsRef: { current: Map<string, string> };
    clearFailedSendRecordsForChat: (chatId: string) => void;
    setChats: (updater: (previousChats: Array<UserChatSummary>) => Array<UserChatSummary>) => void;
    setIsActiveChatLoading: (isLoading: boolean) => void;
    bootstrapChats: (preferredChatId?: string) => Promise<void>;
}): Promise<void> {
    const {
        optimisticChatId,
        previousActiveChatId,
        activeChatIdRef,
        pendingOptimisticChatCreationsRef,
        resolvedOptimisticChatIdsRef,
        clearFailedSendRecordsForChat,
        setChats,
        setIsActiveChatLoading,
        bootstrapChats,
    } = params;

    pendingOptimisticChatCreationsRef.current.delete(optimisticChatId);
    resolvedOptimisticChatIdsRef.current.delete(optimisticChatId);
    clearPendingOutboundMessages(optimisticChatId);
    clearFailedSendRecordsForChat(optimisticChatId);
    setChats((previousChats) => previousChats.filter((chat) => chat.id !== optimisticChatId));

    if (activeChatIdRef.current !== optimisticChatId) {
        return;
    }

    try {
        setIsActiveChatLoading(true);
        await bootstrapChats(previousActiveChatId || undefined);
    } catch {
        setIsActiveChatLoading(false);
    }
}

/**
 * Resolves one outbound client message id, preferring retries of the same payload signature.
 */
function resolveClientMessageIdForSubmission(params: {
    clientMessageId?: string;
    failedSendRecord: FailedSendRecord | null;
}): string {
    const { clientMessageId, failedSendRecord } = params;

    if (clientMessageId) {
        return clientMessageId;
    }

    if (failedSendRecord) {
        return failedSendRecord.clientMessageId;
    }

    return createUserChatClientMessageId();
}

/**
 * Applies local state updates after one durable send succeeds.
 */
function applySuccessfulUserTurnSubmission(params: {
    currentActiveChatId: string;
    resolvedChatId: string;
    signature: string;
    result: UserChatEnqueueResult;
    clearFailedSendRecord: (chatId: string, signature: string) => void;
    activeDraftDirtyRef: { current: boolean };
    isActiveDraftUserOwnedRef: { current: boolean };
    setActiveChatDraftMessage: (draftMessage: string) => void;
    rememberPendingNotificationHintAssistantMessageId: (assistantMessageId: string) => void;
    applyChatDetail: (
        chatDetail: UserChatDetail | UserChatEnqueueResult,
        options?: {
            allowSelectionAdoption?: boolean;
            expectedChatId?: string;
            intentSequence?: number;
            preserveDirtyDraft?: boolean;
            includeInitialMessage?: boolean;
            reason?: string;
        },
    ) => boolean;
}): void {
    const {
        currentActiveChatId,
        resolvedChatId,
        signature,
        result,
        clearFailedSendRecord,
        activeDraftDirtyRef,
        isActiveDraftUserOwnedRef,
        setActiveChatDraftMessage,
        rememberPendingNotificationHintAssistantMessageId,
        applyChatDetail,
    } = params;

    clearFailedSendRecord(currentActiveChatId, signature);
    clearFailedSendRecord(resolvedChatId, signature);
    activeDraftDirtyRef.current = false;
    isActiveDraftUserOwnedRef.current = false;
    setActiveChatDraftMessage('');
    rememberPendingNotificationHintAssistantMessageId(result.job.assistantMessageId);
    applyChatDetail(result, {
        preserveDirtyDraft: false,
        reason: 'send_user_turn',
    });
}

/**
 * Records and surfaces one failed send attempt for a queued user turn.
 */
function handleFailedUserTurnSubmission(params: {
    error: unknown;
    currentActiveChatId: string;
    resolvedChatId: string;
    signature: string;
    clientMessageId: string;
    rememberFailedSendRecord: (chatId: string, record: FailedSendRecord) => void;
    markPendingOutboundMessageFailed: (payload: {
        chatId: string;
        clientMessageId: string;
        errorMessage: string;
    }) => void;
}): void {
    const {
        error,
        currentActiveChatId,
        resolvedChatId,
        signature,
        clientMessageId,
        rememberFailedSendRecord,
        markPendingOutboundMessageFailed,
    } = params;

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
}

/**
 * Sends one queued user turn once its target chat has a durable id.
 */
async function submitQueuedUserTurn(params: {
    agentName: string;
    currentActiveChatId: string;
    payload: {
        message: string;
        attachments?: ChatMessage['attachments'];
        parameters?: Record<string, unknown>;
        clientMessageId?: string;
        replyingTo?: ChatMessage['replyingTo'];
    };
    clientMessageId: string;
    signature: string;
    resolveDurableChatId: (chatId: string) => Promise<string>;
    reassignFailedSendRecordsToChatId: (fromChatId: string, toChatId: string) => void;
    clearFailedSendRecord: (chatId: string, signature: string) => void;
    rememberFailedSendRecord: (chatId: string, record: FailedSendRecord) => void;
    activeDraftDirtyRef: { current: boolean };
    isActiveDraftUserOwnedRef: { current: boolean };
    setActiveChatDraftMessage: (draftMessage: string) => void;
    rememberPendingNotificationHintAssistantMessageId: (assistantMessageId: string) => void;
    applyChatDetail: (
        chatDetail: UserChatDetail | UserChatEnqueueResult,
        options?: {
            allowSelectionAdoption?: boolean;
            expectedChatId?: string;
            intentSequence?: number;
            preserveDirtyDraft?: boolean;
            includeInitialMessage?: boolean;
            reason?: string;
        },
    ) => boolean;
}): Promise<void> {
    const {
        agentName,
        currentActiveChatId,
        payload,
        clientMessageId,
        signature,
        resolveDurableChatId,
        reassignFailedSendRecordsToChatId,
        clearFailedSendRecord,
        rememberFailedSendRecord,
        activeDraftDirtyRef,
        isActiveDraftUserOwnedRef,
        setActiveChatDraftMessage,
        rememberPendingNotificationHintAssistantMessageId,
        applyChatDetail,
    } = params;

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
            threadId: payload.replyingTo ? resolvedChatId : undefined,
            repliedToMessageId: payload.replyingTo?.messageId,
        });

        applySuccessfulUserTurnSubmission({
            currentActiveChatId,
            resolvedChatId,
            signature,
            result,
            clearFailedSendRecord,
            activeDraftDirtyRef,
            isActiveDraftUserOwnedRef,
            setActiveChatDraftMessage,
            rememberPendingNotificationHintAssistantMessageId,
            applyChatDetail,
        });
    } catch (error) {
        handleFailedUserTurnSubmission({
            error,
            currentActiveChatId,
            resolvedChatId,
            signature,
            clientMessageId,
            rememberFailedSendRecord,
            markPendingOutboundMessageFailed,
        });
        throw error;
    }
}

/**
 * Manages canonical chat-history state and user actions for `AgentChatHistoryClient`.
 *
 * @private function of AgentChatHistoryClient
 */
export function useAgentChatHistoryClientState(
    props: AgentChatHistoryClientProps,
): UseAgentChatHistoryClientStateResult {
    const {
        agentName,
        agentTitle,
        initialChatId,
        initialAutoExecuteMessage,
        initialAutoExecuteMessageAttachments,
        initialShareTargetId,
        initialForceNewChat = false,
        isHistoryEnabled,
        isCurrentUserAdmin,
        isHeadlessMode = false,
    } = props;
    const { formatText } = useAgentNaming();
    const { isPrivateModeEnabled } = usePrivateModePreferences();
    const { language, t } = useServerLanguage();
    const { maybePromptAfterUserMessageGesture, rememberDefaultOffHintShown, setFocusedChat, setNotificationsEnabled } =
        useBrowserPushNotifications();
    const isActiveBrowserTab = useActiveBrowserTab();
    const shouldUseHistory = isHistoryEnabled && !isPrivateModeEnabled;
    const newChatHref = useMemo(() => {
        const params = new URLSearchParams();
        params.set('chat', FORCE_NEW_CHAT_QUERY_VALUE);

        if (isHeadlessMode) {
            params.set('headless', '');
        }

        return `/agents/${encodeURIComponent(agentName)}/chat?${params.toString()}`;
    }, [agentName, isHeadlessMode]);
    // Read the profile payload without mutating storage during render because
    // React may restart the render before this mount commits.
    const pendingProfileMessage = useMemo(() => peekPendingProfileMessage(agentName), [agentName]);
    const effectiveInitialAutoExecuteMessage = initialAutoExecuteMessage ?? pendingProfileMessage?.message;
    const effectiveInitialAutoExecuteMessageAttachments =
        initialAutoExecuteMessageAttachments ?? pendingProfileMessage?.attachments;
    const hasInitialAutoExecutePayload = hasAutoExecutePayload(
        effectiveInitialAutoExecuteMessage,
        effectiveInitialAutoExecuteMessageAttachments,
    );
    const shouldSeedInitialOptimisticChat =
        shouldUseHistory &&
        (initialForceNewChat || hasInitialAutoExecutePayload) &&
        (initialForceNewChat || !initialChatId);
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
        shouldUseHistory && (initialForceNewChat || hasInitialAutoExecutePayload)
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
        targetChatId:
            initialOptimisticChatBootstrap?.optimisticChatId || (initialForceNewChat ? null : initialChatId || null),
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
            resolvedOptimisticChatIdsRef.current.set(
                initialOptimisticChatBootstrap.optimisticChatId,
                createdChat.chat.id,
            );
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
        if (!pendingProfileMessage) {
            return;
        }

        clearPendingProfileMessage(agentName);
    }, [agentName, pendingProfileMessage]);

    useEffect(() => {
        activeChatDraftMessageRef.current = activeChatDraftMessage;
    }, [activeChatDraftMessage]);

    useEffect(() => registerChatInputDraftOwnershipTracking(isActiveDraftUserOwnedRef), []);

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
        return maybeShowNotificationsHint({
            activeMessages,
            pendingNotificationHintAssistantMessageIds,
            rememberDefaultOffHintShown,
            setNotificationsEnabled,
            t,
            clearPendingNotificationHintAssistantMessageIds: () => {
                setPendingNotificationHintAssistantMessageIds([]);
            },
        });
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

            return `/agents/${encodeURIComponent(agentName)}/chat?${params.toString()}`;
        },
        [agentName, effectiveInitialAutoExecuteMessage, isHeadlessMode],
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
                clearActiveChatRuntimeState({
                    setActiveMessages,
                    setActiveJobs,
                    setActiveTimeouts,
                    setActiveChatDraftMessage,
                    activeDraftDirtyRef,
                    isActiveDraftUserOwnedRef,
                });
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
            const resolvedChatId = chatDetail.chat.id;

            if (
                isSelectionIntentStale({
                    intentSequence: options.intentSequence,
                    currentIntentSequence: selectionIntentRef.current.sequence,
                    expectedChatId: options.expectedChatId || null,
                    resolvedChatId,
                    reason,
                    staleEvent: 'selection_skip_detail_stale_intent',
                    isSelectionIntentCurrent,
                    logChatSelection,
                })
            ) {
                return false;
            }

            if (
                isUnexpectedResolvedChatId({
                    expectedChatId: options.expectedChatId,
                    resolvedChatId,
                    reason,
                    mismatchEvent: 'selection_skip_detail_chat_mismatch',
                    logChatSelection,
                })
            ) {
                return false;
            }

            const currentSelectedChatId = activeChatIdRef.current;
            if (
                isSelectionMismatchForResolvedChat({
                    allowSelectionAdoption: options.allowSelectionAdoption,
                    currentSelectedChatId,
                    resolvedChatId,
                    reason,
                    mismatchEvent: 'selection_skip_detail_selection_mismatch',
                    isEquivalentSelectedChat,
                    logChatSelection,
                })
            ) {
                setChats((previousChats) => replaceChatInList(previousChats, chatDetail.chat));
                return false;
            }

            setChats((previousChats) => replaceChatInList(previousChats, chatDetail.chat));
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

            if (
                isSelectionIntentStale({
                    intentSequence: options.intentSequence,
                    currentIntentSequence: selectionIntentRef.current.sequence,
                    expectedChatId: options.expectedChatId || snapshot.activeChatId,
                    resolvedChatId: snapshot.activeChatId,
                    reason,
                    staleEvent: 'selection_skip_snapshot_stale_intent',
                    isSelectionIntentCurrent,
                    logChatSelection,
                })
            ) {
                return false;
            }

            if (
                isUnexpectedResolvedChatId({
                    expectedChatId: options.expectedChatId,
                    resolvedChatId: snapshot.activeChatId,
                    reason,
                    mismatchEvent: 'selection_skip_snapshot_chat_mismatch',
                    logChatSelection,
                })
            ) {
                return false;
            }

            const currentSelectedChatId = activeChatIdRef.current;
            if (
                isSelectionMismatchForResolvedChat({
                    allowSelectionAdoption: options.allowSelectionAdoption,
                    currentSelectedChatId,
                    resolvedChatId: snapshot.activeChatId,
                    reason,
                    mismatchEvent: 'selection_skip_snapshot_selection_mismatch',
                    isEquivalentSelectedChat,
                    logChatSelection,
                })
            ) {
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
        initialChatId,
        rejectInitialOptimisticChatBootstrap,
        shouldUseHistory,
        syncActiveChatSelection,
    ]);

    useEffect(() => {
        autoExecuteTargetChatIdRef.current = initialForceNewChat ? undefined : initialChatId;
    }, [initialChatId, initialForceNewChat]);

    useEffect(() => {
        shareTargetIdRef.current = initialShareTargetId;
    }, [initialShareTargetId]);

    useEffect(() => registerActiveTimeoutTicker(hasAnyActiveTimeouts, setCurrentTimestamp), [hasAnyActiveTimeouts]);

    useEffect(
        () =>
            registerDraftFlushLifecycle({
                shouldUseHistory,
                flushActiveDraft,
            }),
        [flushActiveDraft, shouldUseHistory],
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
            shouldUseHistory,
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
            finalizeCreatedOptimisticChat({
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
            await rollbackCreatedOptimisticChat({
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
     * Tracks assistant replies that should trigger the browser notifications hint once complete.
     */
    const rememberPendingNotificationHintAssistantMessageId = useCallback((assistantMessageId: string) => {
        setPendingNotificationHintAssistantMessageIds((assistantMessageIds) =>
            assistantMessageIds.includes(assistantMessageId)
                ? assistantMessageIds
                : [...assistantMessageIds, assistantMessageId],
        );
    }, []);

    /**
     * Submits one user-authored chat turn for durable server-side execution.
     */
    const handleSubmitUserTurn = useCallback(
        async (payload: {
            message: string;
            attachments?: ChatMessage['attachments'];
            parameters?: Record<string, unknown>;
            clientMessageId?: string;
            replyingTo?: ChatMessage['replyingTo'];
        }) => {
            const currentActiveChatId = activeChatIdRef.current;
            if (!shouldUseHistory || !currentActiveChatId) {
                throw new Error('No active chat selected.');
            }

            const signature = createChatMessageSignature(payload.message, payload.attachments, payload.replyingTo);
            const failedSendRecord = resolveFailedSendRecord(currentActiveChatId, signature);
            const clientMessageId = resolveClientMessageIdForSubmission({
                clientMessageId: payload.clientMessageId,
                failedSendRecord,
            });

            queuePendingOutboundMessage({
                chatId: currentActiveChatId,
                clientMessageId,
                content: payload.message,
                attachments: payload.attachments,
                replyingTo: payload.replyingTo,
            });

            if (!payload.clientMessageId) {
                maybePromptAfterUserMessageGesture();
            }

            const submitPromise = submitUserTurnQueueRef.current
                .catch(() => undefined)
                .then(() =>
                    submitQueuedUserTurn({
                        agentName,
                        currentActiveChatId,
                        payload,
                        clientMessageId,
                        signature,
                        resolveDurableChatId,
                        reassignFailedSendRecordsToChatId,
                        clearFailedSendRecord,
                        rememberFailedSendRecord,
                        activeDraftDirtyRef,
                        isActiveDraftUserOwnedRef,
                        setActiveChatDraftMessage,
                        rememberPendingNotificationHintAssistantMessageId,
                        applyChatDetail,
                    }),
                );

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
            rememberPendingNotificationHintAssistantMessageId,
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
    const autoExecuteMessage = shouldAutoExecuteCurrentChat ? effectiveInitialAutoExecuteMessage ?? '' : undefined;
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

    return {
        formatText,
        shouldUseHistory,
        effectiveInitialAutoExecuteMessage,
        effectiveInitialAutoExecuteMessageAttachments,
        chats,
        activeChatId,
        activeChatSummary,
        activeChatDraftMessage,
        activeJobs,
        activeTimeouts,
        renderedActiveMessages,
        isChatListLoading,
        isActiveChatLoading,
        isActiveChatReadOnly,
        isSidebarCollapsed,
        shouldShowExternalChats,
        currentTimestamp,
        autoExecuteMessage,
        newChatHref,
        untitledChatTitle,
        formatChatTimestamp,
        handleSelectChatFromSidebar,
        handleDeleteChat,
        handleShowExternalChatsChange,
        toggleSidebarCollapsed,
        closeMobileSidebar,
        handleDraftMessageChange,
        handleSubmitUserTurn,
        handleCancelActiveJob,
        handleCancelActiveTimeout,
        handleAutoExecuteMessagePending,
        handleAutoExecuteMessageConsumed,
    };
}

/**
 * Returns true when one initial auto-execute payload contains a message or attachments.
 */
function hasAutoExecutePayload(
    message: string | undefined,
    attachments: ChatMessage['attachments'] | undefined,
): boolean {
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
function createChatMessageSignature(
    message: string,
    attachments?: ChatMessage['attachments'],
    replyingTo?: ChatMessage['replyingTo'],
): string {
    return JSON.stringify({
        message,
        attachments: attachments || [],
        replyingTo: serializeReplyingToSignature(replyingTo),
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
