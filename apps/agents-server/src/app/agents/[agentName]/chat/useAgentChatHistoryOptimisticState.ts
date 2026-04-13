'use client';

import { useCallback, useRef } from 'react';
import type { UserChatDetail, UserChatSummary } from '../../../../utils/userChatClient';
import { createUserChatClientMessageId } from '../../../../utils/userChatClient';
import { USER_CHAT_SOURCES } from '../../../../utils/userChat/UserChatSource';
import { AgentChatHistoryPayloadState } from './AgentChatHistoryPayloadState';
import { clearPendingOutboundMessages, reassignPendingOutboundMessagesChatId } from './usePendingOutboundMessages';

/**
 * Prefix used for temporary optimistic chat identifiers before the server returns a durable id.
 *
 * @private function of useAgentChatHistoryClientState
 */
const OPTIMISTIC_CHAT_ID_PREFIX = 'optimistic-user-chat';

/**
 * One failed send record keyed by message signature for a single chat.
 *
 * @private function of useAgentChatHistoryClientState
 */
export type FailedSendRecord = {
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
export type InitialOptimisticChatBootstrap = {
    optimisticChatId: string;
    createdAt: string;
    createChatDeferred: Deferred<UserChatDetail>;
};

/**
 * Inputs required to manage optimistic chat ids and failed-send bookkeeping.
 *
 * @private function of useAgentChatHistoryClientState
 */
type UseAgentChatHistoryOptimisticStateProps = {
    readonly shouldUseHistory: boolean;
    readonly initialChatId?: string;
    readonly initialForceNewChat: boolean;
    readonly hasInitialAutoExecutePayload: boolean;
};

/**
 * Optimistic chat bookkeeping returned to the durable chat-history shell.
 *
 * @private function of useAgentChatHistoryClientState
 */
type UseAgentChatHistoryOptimisticStateResult = {
    readonly initialChats: Array<UserChatSummary>;
    readonly initialSelectedChatId: string | null;
    readonly initialOptimisticChatBootstrapRef: { current: InitialOptimisticChatBootstrap | null };
    readonly failedSendByChatIdRef: { current: Map<string, Map<string, string>> };
    readonly pendingOptimisticChatCreationsRef: { current: Map<string, Promise<UserChatDetail>> };
    readonly resolvedOptimisticChatIdsRef: { current: Map<string, string> };
    readonly resolveFailedSendRecord: (chatId: string, signature: string) => FailedSendRecord | null;
    readonly rememberFailedSendRecord: (chatId: string, record: FailedSendRecord) => void;
    readonly clearFailedSendRecord: (chatId: string, signature: string) => void;
    readonly clearFailedSendRecordsForChat: (chatId: string) => void;
    readonly reassignFailedSendRecordsToChatId: (fromChatId: string, toChatId: string) => void;
    readonly resolveInitialOptimisticChatBootstrap: (createdChat: UserChatDetail) => void;
    readonly rejectInitialOptimisticChatBootstrap: (error: unknown) => void;
    readonly resolveDurableChatId: (chatId: string) => Promise<string>;
    readonly isEquivalentSelectedChat: (selectedChatId: string | null, resolvedChatId: string) => boolean;
};

/**
 * Optimistic-chat helpers shared across the durable chat-history flow.
 *
 * @private function of useAgentChatHistoryClientState
 */
export const AgentChatHistoryOptimisticState = {
    createOptimisticChatId,
    isOptimisticChatId,
    createOptimisticUserChatSummary,
    replaceOptimisticChatWithCanonicalChat,
    finalizeCreatedOptimisticChat,
    rollbackCreatedOptimisticChat,
};

/**
 * Keeps optimistic chat ids, deferred durable mappings, and failed-send records focused on one state slice.
 *
 * @private function of useAgentChatHistoryClientState
 */
export function useAgentChatHistoryOptimisticState({
    shouldUseHistory,
    initialChatId,
    initialForceNewChat,
    hasInitialAutoExecutePayload,
}: UseAgentChatHistoryOptimisticStateProps): UseAgentChatHistoryOptimisticStateResult {
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
    const initialChats = initialOptimisticChatBootstrap
        ? [
              createOptimisticUserChatSummary(
                  initialOptimisticChatBootstrap.optimisticChatId,
                  initialOptimisticChatBootstrap.createdAt,
              ),
          ]
        : [];
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

            if (
                !pendingOptimisticChatCreationsRef.current.has(currentInitialOptimisticChatBootstrap.optimisticChatId)
            ) {
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
            reassignFailedSendRecordsToChatId(
                currentInitialOptimisticChatBootstrap.optimisticChatId,
                createdChat.chat.id,
            );
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

    return {
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
    };
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
    applyChatDetail: (
        chatDetail: UserChatDetail,
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

    return AgentChatHistoryPayloadState.replaceChatInList(chatsWithoutPlaceholder, canonicalChat);
}
