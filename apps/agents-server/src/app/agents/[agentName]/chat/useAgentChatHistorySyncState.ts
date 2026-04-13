'use client';

import type { ChatMessage } from '@promptbook-local/types';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
    cancelUserChatJob,
    cancelUserChatTimeout,
    fetchUserChats,
    type UserChatDetail,
    type UserChatEnqueueResult,
    type UserChatJob,
    type UserChatSummary,
    type UserChatTimeout,
} from '../../../../utils/userChatClient';
import { AgentChatHistoryPayloadState } from './AgentChatHistoryPayloadState';
import { AgentChatHistorySyncOperations } from './AgentChatHistorySyncOperations';
import { useAgentChatHistoryDraftState } from './useAgentChatHistoryDraftState';
import {
    AgentChatHistoryOptimisticState,
    type FailedSendRecord,
    useAgentChatHistoryOptimisticState,
} from './useAgentChatHistoryOptimisticState';
import { useAgentChatHistorySyncEffects } from './useAgentChatHistorySyncEffects';

/**
 * One explicit chat-selection intent issued by the user-facing chat history UI.
 *
 * @private function of useAgentChatHistoryClientState
 */
export type ChatSelectionIntent = {
    sequence: number;
    kind: 'BOOTSTRAP' | 'OPEN_CHAT' | 'NEW_CHAT' | 'DELETE_CHAT';
    targetChatId: string | null;
};

/**
 * Development-only trace helper used across durable chat-selection flows.
 *
 * @private function of useAgentChatHistoryClientState
 */
export type LogChatSelection = (event: string, payload?: Record<string, unknown>) => void;

/**
 * Shared applicability callback used when canonical chat payloads arrive from the server.
 *
 * @private function of useAgentChatHistoryClientState
 */
export type ApplyAgentChatDetail = (
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

/**
 * Shared options used when canonical chat payloads update the active selection.
 *
 * @private function of useAgentChatHistoryClientState
 */
export type ApplyAgentChatPayloadOptions = NonNullable<Parameters<ApplyAgentChatDetail>[1]>;

/**
 * One fetched snapshot of the chat list plus the currently active chat payload.
 *
 * @private function of useAgentChatHistoryClientState
 */
export type UserChatsSnapshot = Awaited<ReturnType<typeof fetchUserChats>>;

/**
 * Shared callback that synchronizes selected-chat state with local runtime data and the browser URL.
 *
 * @private function of useAgentChatHistoryClientState
 */
export type SyncActiveChatSelection = (
    chatId: string | null,
    options: {
        clearChatContent?: boolean;
        includeInitialMessage?: boolean;
        reason: string;
    },
) => void;

/**
 * Loads one canonical chat snapshot for an optional preferred chat id.
 *
 * @private function of useAgentChatHistoryClientState
 */
export type FetchChatSnapshot = (chatId?: string) => Promise<UserChatsSnapshot>;

/**
 * Refreshes the active canonical chat selection from the server.
 *
 * @private function of useAgentChatHistoryClientState
 */
export type RefreshActiveChat = (options?: { preserveDirtyDraft?: boolean }) => Promise<void>;

/**
 * Inputs required to orchestrate durable chat history synchronization.
 *
 * @private function of useAgentChatHistoryClientState
 */
type UseAgentChatHistorySyncStateProps = {
    readonly agentName: string;
    readonly formatText: (text: string) => string;
    readonly shouldUseHistory: boolean;
    readonly shouldShowExternalChats: boolean;
    readonly initialChatId?: string;
    readonly initialForceNewChat: boolean;
    readonly hasInitialAutoExecutePayload: boolean;
    readonly effectiveInitialAutoExecuteMessage: string | undefined;
    readonly hasInitialAutoMessageBeenConsumedRef: { current: boolean };
    readonly isHeadlessMode: boolean;
    readonly initialShareTargetId?: string;
    readonly autoExecuteTargetChatIdRef: { current: string | undefined };
    readonly shareTargetIdRef: { current: string | undefined };
    readonly isActiveBrowserTab: boolean;
    readonly setFocusedChat: (
        focusedChat: { agentPermanentId: string; chatId: string; isChatFocused: boolean } | null,
    ) => void;
};

/**
 * State and actions returned for the durable chat-history shell.
 *
 * @private function of useAgentChatHistoryClientState
 */
type UseAgentChatHistorySyncStateResult = {
    readonly chats: Array<UserChatSummary>;
    readonly activeChatId: string | null;
    readonly activeChatSummary: UserChatSummary | null;
    readonly activeChatDraftMessage: string;
    readonly activeMessages: Array<ChatMessage>;
    readonly activeJobs: Array<UserChatJob>;
    readonly activeTimeouts: Array<UserChatTimeout>;
    readonly isChatListLoading: boolean;
    readonly isActiveChatLoading: boolean;
    readonly isActiveChatReadOnly: boolean;
    readonly isActiveChatOptimistic: boolean;
    readonly currentTimestamp: number;
    readonly activeChatIdRef: { current: string | null };
    readonly activeDraftDirtyRef: { current: boolean };
    readonly isActiveDraftUserOwnedRef: { current: boolean };
    readonly setActiveChatDraftMessage: (draftMessage: string) => void;
    readonly handleSelectChatFromSidebar: (chatId: string) => void;
    readonly handleCreateChat: () => Promise<void>;
    readonly handleDeleteChat: (chatId: string) => Promise<void>;
    readonly handleDraftMessageChange: (draftMessage: string) => void;
    readonly handleCancelActiveJob: (jobId: string) => Promise<void>;
    readonly handleCancelActiveTimeout: (timeoutId: string) => Promise<void>;
    readonly resolveDurableChatId: (chatId: string) => Promise<string>;
    readonly resolveFailedSendRecord: (chatId: string, signature: string) => FailedSendRecord | null;
    readonly rememberFailedSendRecord: (chatId: string, record: FailedSendRecord) => void;
    readonly clearFailedSendRecord: (chatId: string, signature: string) => void;
    readonly reassignFailedSendRecordsToChatId: (fromChatId: string, toChatId: string) => void;
    readonly applyChatDetail: ApplyAgentChatDetail;
};

/**
 * Keeps durable chat-history synchronization focused on selection, optimistic chat lifecycle,
 * and canonical server snapshots.
 *
 * @private function of useAgentChatHistoryClientState
 */
export function useAgentChatHistorySyncState({
    agentName,
    formatText,
    shouldUseHistory,
    shouldShowExternalChats,
    initialChatId,
    initialForceNewChat,
    hasInitialAutoExecutePayload,
    effectiveInitialAutoExecuteMessage,
    hasInitialAutoMessageBeenConsumedRef,
    isHeadlessMode,
    initialShareTargetId,
    autoExecuteTargetChatIdRef,
    shareTargetIdRef,
    isActiveBrowserTab,
    setFocusedChat,
}: UseAgentChatHistorySyncStateProps): UseAgentChatHistorySyncStateResult {
    const {
        initialChats,
        initialSelectedChatId,
        initialOptimisticChatBootstrapRef,
        failedSendByChatIdRef,
        pendingOptimisticChatCreationsRef,
        resolvedOptimisticChatIdsRef,
        resolveFailedSendRecord,
        rememberFailedSendRecord,
        clearFailedSendRecord,
        clearFailedSendRecordsForChat,
        reassignFailedSendRecordsToChatId,
        resolveInitialOptimisticChatBootstrap,
        rejectInitialOptimisticChatBootstrap,
        resolveDurableChatId,
        isEquivalentSelectedChat,
    } = useAgentChatHistoryOptimisticState({
        shouldUseHistory,
        initialChatId,
        initialForceNewChat,
        hasInitialAutoExecutePayload,
    });
    const initialOptimisticChatBootstrap = initialOptimisticChatBootstrapRef.current;
    const [chats, setChats] = useState<Array<UserChatSummary>>(() => initialChats);
    const [activeChatId, setActiveChatId] = useState<string | null>(initialSelectedChatId);
    const [activeMessages, setActiveMessages] = useState<Array<ChatMessage>>([]);
    const [activeJobs, setActiveJobs] = useState<Array<UserChatJob>>([]);
    const [activeTimeouts, setActiveTimeouts] = useState<Array<UserChatTimeout>>([]);
    const [, setIsBootstrapping] = useState(shouldUseHistory);
    const [isChatListLoading, setIsChatListLoading] = useState(shouldUseHistory);
    const [isActiveChatLoading, setIsActiveChatLoading] = useState(false);
    const [isActiveChatStreamConnected, setIsActiveChatStreamConnected] = useState(false);
    const [isCreatingChat, setIsCreatingChat] = useState(false);
    const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());
    const activeChatIdRef = useRef<string | null>(initialSelectedChatId);
    const isRefreshingRef = useRef(false);
    const selectionIntentRef = useRef<ChatSelectionIntent>({
        sequence: 0,
        kind: 'BOOTSTRAP',
        targetChatId:
            initialOptimisticChatBootstrap?.optimisticChatId || (initialForceNewChat ? null : initialChatId || null),
    });
    const {
        activeChatDraftMessage,
        activeDraftDirtyRef,
        isActiveDraftUserOwnedRef,
        setActiveChatDraftMessage,
        flushActiveDraft,
        handleDraftMessageChange,
    } = useAgentChatHistoryDraftState({
        agentName,
        shouldUseHistory,
        activeChatIdRef,
        isOptimisticChatId: AgentChatHistoryOptimisticState.isOptimisticChatId,
    });

    const logChatSelection = useCallback<LogChatSelection>(
        (event, payload = {}) => {
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

    const activeChatSummary = useMemo(
        () => chats.find((chat) => chat.id === activeChatId) || null,
        [activeChatId, chats],
    );
    const isActiveChatReadOnly = activeChatSummary?.isReadOnly === true;
    const isActiveChatOptimistic = Boolean(
        activeChatId && AgentChatHistoryOptimisticState.isOptimisticChatId(activeChatId),
    );
    const hasAnyActiveTimeouts = useMemo(
        () => chats.some((chat) => chat.timeoutActivity.count > 0) || activeTimeouts.length > 0,
        [activeTimeouts.length, chats],
    );

    const fetchChatSnapshot = useCallback<FetchChatSnapshot>(
        (chatId) =>
            fetchUserChats(agentName, chatId, {
                showExternalChats: shouldShowExternalChats,
            }),
        [agentName, shouldShowExternalChats],
    );

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
        [agentName, effectiveInitialAutoExecuteMessage, isHeadlessMode, shareTargetIdRef],
    );

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

    const isSelectionIntentCurrent = useCallback(
        (sequence: number): boolean => selectionIntentRef.current.sequence === sequence,
        [],
    );

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

    const syncActiveChatSelection = useCallback<SyncActiveChatSelection>(
        (chatId, options) => {
            activeChatIdRef.current = chatId;
            setActiveChatId(chatId);

            if (options.clearChatContent === true || chatId === null) {
                AgentChatHistoryPayloadState.clearActiveChatRuntimeState({
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
        [
            activeDraftDirtyRef,
            isActiveDraftUserOwnedRef,
            logChatSelection,
            replaceActiveChatRoute,
            setActiveChatDraftMessage,
        ],
    );

    const applyChatDetail = useCallback<ApplyAgentChatDetail>(
        (chatDetail, options: ApplyAgentChatPayloadOptions = {}): boolean =>
            AgentChatHistoryPayloadState.applyChatDetailStateUpdate({
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
            }),
        [
            activeDraftDirtyRef,
            isActiveDraftUserOwnedRef,
            isEquivalentSelectedChat,
            isSelectionIntentCurrent,
            logChatSelection,
            setActiveChatDraftMessage,
            syncActiveChatSelection,
        ],
    );

    const applySnapshot = useCallback(
        (snapshot: UserChatsSnapshot, options: ApplyAgentChatPayloadOptions = {}): boolean =>
            AgentChatHistoryPayloadState.applySnapshotStateUpdate({
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
            }),
        [
            activeDraftDirtyRef,
            isActiveDraftUserOwnedRef,
            isEquivalentSelectedChat,
            isSelectionIntentCurrent,
            logChatSelection,
            setActiveChatDraftMessage,
            syncActiveChatSelection,
        ],
    );

    const createBootstrapChat = useCallback(
        (snapshot: UserChatsSnapshot, intentSequence: number): Promise<void> =>
            AgentChatHistorySyncOperations.createBootstrapChatFromSnapshot({
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
            }),
        [
            agentName,
            applyChatDetail,
            autoExecuteTargetChatIdRef,
            hasInitialAutoExecutePayload,
            hasInitialAutoMessageBeenConsumedRef,
            initialOptimisticChatBootstrapRef,
            resolveInitialOptimisticChatBootstrap,
        ],
    );

    const bootstrapChats = useCallback(
        (preferredChatId?: string): Promise<void> =>
            AgentChatHistorySyncOperations.bootstrapChatSelection({
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
            }),
        [
            applySnapshot,
            autoExecuteTargetChatIdRef,
            createBootstrapChat,
            fetchChatSnapshot,
            hasInitialAutoExecutePayload,
            hasInitialAutoMessageBeenConsumedRef,
            initialForceNewChat,
            initialOptimisticChatBootstrapRef,
            issueSelectionIntent,
            logChatSelection,
        ],
    );

    const refreshActiveChat = useCallback<RefreshActiveChat>(
        (options = { preserveDirtyDraft: true }) =>
            AgentChatHistorySyncOperations.refreshSelectedChat({
                shouldUseHistory,
                options,
                activeChatIdRef,
                isRefreshingRef,
                fetchChatSnapshot,
                logChatSelection,
                bootstrapChats,
                applySnapshot,
            }),
        [applySnapshot, bootstrapChats, fetchChatSnapshot, logChatSelection, shouldUseHistory],
    );

    const handleSelectChat = useCallback(
        (chatId: string): Promise<void> =>
            AgentChatHistorySyncOperations.openSelectedChat({
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
            }),
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
        },
        [handleSelectChat],
    );

    const handleCreateChat = useCallback(
        (): Promise<void> =>
            AgentChatHistorySyncOperations.createAndSelectOptimisticChat({
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
            }),
        [
            agentName,
            applyChatDetail,
            bootstrapChats,
            clearFailedSendRecordsForChat,
            flushActiveDraft,
            isCreatingChat,
            issueSelectionIntent,
            logChatSelection,
            pendingOptimisticChatCreationsRef,
            reassignFailedSendRecordsToChatId,
            resolvedOptimisticChatIdsRef,
            syncActiveChatSelection,
        ],
    );

    const handleDeleteChat = useCallback(
        (chatId: string): Promise<void> =>
            AgentChatHistorySyncOperations.deleteChatAndRefresh({
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
            }),
        [
            agentName,
            bootstrapChats,
            clearFailedSendRecordsForChat,
            formatText,
            issueSelectionIntent,
            pendingOptimisticChatCreationsRef,
            refreshActiveChat,
            resolvedOptimisticChatIdsRef,
        ],
    );

    const handleCancelActiveJob = useCallback(
        (jobId: string): Promise<void> =>
            AgentChatHistorySyncOperations.cancelSelectedChatResource({
                resourceId: jobId,
                activeChatIdRef,
                cancelResource: (chatId, currentJobId) => cancelUserChatJob(agentName, chatId, currentJobId),
                applyChatDetail,
                reason: 'cancel_active_job',
            }),
        [agentName, applyChatDetail],
    );

    const handleCancelActiveTimeout = useCallback(
        (timeoutId: string): Promise<void> =>
            AgentChatHistorySyncOperations.cancelSelectedChatResource({
                resourceId: timeoutId,
                activeChatIdRef,
                cancelResource: (chatId, currentTimeoutId) =>
                    cancelUserChatTimeout(agentName, chatId, currentTimeoutId),
                applyChatDetail,
                reason: 'cancel_active_timeout',
            }),
        [agentName, applyChatDetail],
    );

    useAgentChatHistorySyncEffects({
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
    });

    return {
        chats,
        activeChatId,
        activeChatSummary,
        activeChatDraftMessage,
        activeMessages,
        activeJobs,
        activeTimeouts,
        isChatListLoading,
        isActiveChatLoading,
        isActiveChatReadOnly,
        isActiveChatOptimistic,
        currentTimestamp,
        activeChatIdRef,
        activeDraftDirtyRef,
        isActiveDraftUserOwnedRef,
        setActiveChatDraftMessage,
        handleSelectChatFromSidebar,
        handleCreateChat,
        handleDeleteChat,
        handleDraftMessageChange,
        handleCancelActiveJob,
        handleCancelActiveTimeout,
        resolveDurableChatId,
        resolveFailedSendRecord,
        rememberFailedSendRecord,
        clearFailedSendRecord,
        reassignFailedSendRecordsToChatId,
        applyChatDetail,
    };
}

/**
 * Replaces browser URL without triggering App Router navigation.
 *
 * @private function of useAgentChatHistoryClientState
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
