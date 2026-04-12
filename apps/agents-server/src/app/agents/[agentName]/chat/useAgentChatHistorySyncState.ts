'use client';

import type { ChatMessage } from '@promptbook-local/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { showConfirm } from '../../../../components/AsyncDialogs/asyncDialogs';
import { notifyError } from '../../../../components/Notifications/notifications';
import {
    cancelUserChatJob,
    cancelUserChatTimeout,
    createUserChat,
    createUserChatClientMessageId,
    fetchUserChats,
    removeUserChat,
    streamUserChat,
    type UserChatDetail,
    type UserChatEnqueueResult,
    type UserChatJob,
    type UserChatSummary,
    type UserChatTimeout,
} from '../../../../utils/userChatClient';
import { USER_CHAT_SOURCES } from '../../../../utils/userChat/UserChatSource';
import { useAgentChatHistoryDraftState } from './useAgentChatHistoryDraftState';
import {
    clearPendingOutboundMessages,
    reassignPendingOutboundMessagesChatId,
    reconcilePendingOutboundMessages,
} from './usePendingOutboundMessages';

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
 * Prefix used for temporary optimistic chat identifiers before the server returns a durable id.
 *
 * @private function of useAgentChatHistoryClientState
 */
const OPTIMISTIC_CHAT_ID_PREFIX = 'optimistic-user-chat';

/**
 * One explicit chat-selection intent issued by the user-facing chat history UI.
 *
 * @private function of useAgentChatHistoryClientState
 */
type ChatSelectionIntent = {
    sequence: number;
    kind: 'BOOTSTRAP' | 'OPEN_CHAT' | 'NEW_CHAT' | 'DELETE_CHAT';
    targetChatId: string | null;
};

/**
 * One failed send record keyed by message signature for a single chat.
 *
 * @private function of useAgentChatHistoryClientState
 */
type FailedSendRecord = {
    signature: string;
    clientMessageId: string;
};

/**
 * One deferred promise handle used to bridge optimistic chat state with a later durable server result.
 *
 * @private function of useAgentChatHistoryClientState
 */
type Deferred<TValue> = {
    promise: Promise<TValue>;
    resolve: (value: TValue | PromiseLike<TValue>) => void;
    reject: (reason?: unknown) => void;
};

/**
 * One optimistic bootstrapping chat created before the durable chat exists.
 *
 * @private function of useAgentChatHistoryClientState
 */
type InitialOptimisticChatBootstrap = {
    optimisticChatId: string;
    createdAt: string;
    createChatDeferred: Deferred<UserChatDetail>;
};

/**
 * Shared applicability callback used when canonical chat payloads arrive from the server.
 *
 * @private function of useAgentChatHistoryClientState
 */
type ApplyAgentChatDetail = (
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
 * Validation result describing whether one resolved chat payload should update the active selection.
 *
 * @private function of useAgentChatHistoryClientState
 */
type ChatPayloadValidationResult = {
    shouldApplyPayload: boolean;
    shouldUpdateChatList: boolean;
};

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
    readonly setFocusedChat: (focusedChat: { agentPermanentId: string; chatId: string; isChatFocused: boolean } | null) => void;
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
    const [, setIsBootstrapping] = useState(shouldUseHistory);
    const [isChatListLoading, setIsChatListLoading] = useState(shouldUseHistory);
    const [isActiveChatLoading, setIsActiveChatLoading] = useState(false);
    const [isActiveChatStreamConnected, setIsActiveChatStreamConnected] = useState(false);
    const [isCreatingChat, setIsCreatingChat] = useState(false);
    const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());
    const activeChatIdRef = useRef<string | null>(initialSelectedChatId);
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
        isOptimisticChatId,
    });

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

    const rememberFailedSendRecord = useCallback((chatId: string, record: FailedSendRecord): void => {
        const chatFailures = failedSendByChatIdRef.current.get(chatId) || new Map<string, string>();
        chatFailures.set(record.signature, record.clientMessageId);
        failedSendByChatIdRef.current.set(chatId, chatFailures);
    }, []);

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

    const clearFailedSendRecordsForChat = useCallback((chatId: string): void => {
        failedSendByChatIdRef.current.delete(chatId);
    }, []);

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

    const resolveInitialOptimisticChatBootstrap = useCallback(
        (createdChat: UserChatDetail): void => {
            const currentInitialOptimisticChatBootstrap = initialOptimisticChatBootstrapRef.current;
            if (!currentInitialOptimisticChatBootstrap) {
                return;
            }

            if (!pendingOptimisticChatCreationsRef.current.has(currentInitialOptimisticChatBootstrap.optimisticChatId)) {
                return;
            }

            currentInitialOptimisticChatBootstrap.createChatDeferred.resolve(createdChat);
            pendingOptimisticChatCreationsRef.current.delete(currentInitialOptimisticChatBootstrap.optimisticChatId);
            resolvedOptimisticChatIdsRef.current.set(
                currentInitialOptimisticChatBootstrap.optimisticChatId,
                createdChat.chat.id,
            );
            reassignPendingOutboundMessagesChatId({
                fromChatId: currentInitialOptimisticChatBootstrap.optimisticChatId,
                toChatId: createdChat.chat.id,
            });
            reassignFailedSendRecordsToChatId(currentInitialOptimisticChatBootstrap.optimisticChatId, createdChat.chat.id);
        },
        [reassignFailedSendRecordsToChatId],
    );

    const rejectInitialOptimisticChatBootstrap = useCallback((error: unknown): void => {
        const currentInitialOptimisticChatBootstrap = initialOptimisticChatBootstrapRef.current;
        if (!currentInitialOptimisticChatBootstrap) {
            return;
        }

        if (!pendingOptimisticChatCreationsRef.current.has(currentInitialOptimisticChatBootstrap.optimisticChatId)) {
            return;
        }

        currentInitialOptimisticChatBootstrap.createChatDeferred.reject(error);
    }, []);

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

    const isEquivalentSelectedChat = useCallback((selectedChatId: string | null, resolvedChatId: string): boolean => {
        if (selectedChatId === resolvedChatId) {
            return true;
        }

        if (!selectedChatId || !isOptimisticChatId(selectedChatId)) {
            return false;
        }

        return resolvedOptimisticChatIdsRef.current.get(selectedChatId) === resolvedChatId;
    }, []);

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

    const activeChatSummary = useMemo(
        () => chats.find((chat) => chat.id === activeChatId) || null,
        [activeChatId, chats],
    );
    const isActiveChatReadOnly = activeChatSummary?.isReadOnly === true;
    const isActiveChatOptimistic = Boolean(activeChatId && isOptimisticChatId(activeChatId));
    const hasAnyActiveTimeouts = useMemo(
        () => chats.some((chat) => chat.timeoutActivity.count > 0) || activeTimeouts.length > 0,
        [activeTimeouts.length, chats],
    );

    const fetchChatSnapshot = useCallback(
        (chatId?: string) =>
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
        [
            activeDraftDirtyRef,
            isActiveDraftUserOwnedRef,
            logChatSelection,
            replaceActiveChatRoute,
            setActiveChatDraftMessage,
        ],
    );

    const applyChatDetail = useCallback<ApplyAgentChatDetail>(
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
        },
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
        },
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
        async (
            snapshot: Awaited<ReturnType<typeof fetchUserChats>>,
            intentSequence: number,
        ): Promise<void> => {
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
            const currentInitialOptimisticChatBootstrap = initialOptimisticChatBootstrapRef.current;
            setChats(
                currentInitialOptimisticChatBootstrap
                    ? replaceOptimisticChatWithCanonicalChat(
                          snapshot.chats,
                          currentInitialOptimisticChatBootstrap.optimisticChatId,
                          createdChat.chat,
                      )
                    : [createdChat.chat, ...snapshot.chats.filter((chat) => chat.id !== createdChat.chat.id)],
            );

        },
        [
            agentName,
            applyChatDetail,
            autoExecuteTargetChatIdRef,
            hasInitialAutoExecutePayload,
            hasInitialAutoMessageBeenConsumedRef,
            resolveInitialOptimisticChatBootstrap,
        ],
    );

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
        },
        [
            applyChatDetail,
            applySnapshot,
            autoExecuteTargetChatIdRef,
            createBootstrapChat,
            fetchChatSnapshot,
            hasInitialAutoExecutePayload,
            hasInitialAutoMessageBeenConsumedRef,
            initialForceNewChat,
            issueSelectionIntent,
            logChatSelection,
        ],
    );

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
        initialChatId,
        rejectInitialOptimisticChatBootstrap,
        shouldUseHistory,
        syncActiveChatSelection,
    ]);

    useEffect(() => registerActiveTimeoutTicker(hasAnyActiveTimeouts, setCurrentTimestamp), [hasAnyActiveTimeouts]);

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
        },
        [handleSelectChat],
    );

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
    logChatSelection: (event: string, payload?: Record<string, unknown>) => void;
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
 *
 * @private function of useAgentChatHistoryClientState
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
 *
 * @private function of useAgentChatHistoryClientState
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

/**
 * Finalizes a newly created optimistic chat with the canonical server result.
 *
 * @private function of useAgentChatHistoryClientState
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
    applyChatDetail: ApplyAgentChatDetail;
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
 *
 * @private function of useAgentChatHistoryClientState
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
 * Creates one deferred promise handle for optimistic chat bootstrapping.
 *
 * @private function of useAgentChatHistoryClientState
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
 *
 * @private function of useAgentChatHistoryClientState
 */
function createOptimisticChatId(): string {
    return `${OPTIMISTIC_CHAT_ID_PREFIX}:${createUserChatClientMessageId()}`;
}

/**
 * Returns true when the provided chat id is a local optimistic placeholder id.
 *
 * @private function of useAgentChatHistoryClientState
 */
function isOptimisticChatId(chatId: string): boolean {
    return chatId.startsWith(`${OPTIMISTIC_CHAT_ID_PREFIX}:`);
}

/**
 * Builds one local placeholder chat summary used for optimistic new-chat navigation.
 *
 * @private function of useAgentChatHistoryClientState
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
 *
 * @private function of useAgentChatHistoryClientState
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
 * Resolves one unknown error to a user-facing message.
 *
 * @private function of useAgentChatHistoryClientState
 */
function resolveErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
}

/**
 * Moves one chat summary to the top of the sidebar list.
 *
 * @private function of useAgentChatHistoryClientState
 */
function replaceChatInList(chats: ReadonlyArray<UserChatSummary>, targetChat: UserChatSummary): Array<UserChatSummary> {
    const remainingChats = chats.filter((chat) => chat.id !== targetChat.id);
    return [targetChat, ...remainingChats];
}
