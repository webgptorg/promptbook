'use client';

import type { ChatMessage } from '@promptbook-local/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { notifyInfo } from '../../../../components/Notifications/notifications';
import { useServerLanguage } from '../../../../components/ServerLanguage/ServerLanguageProvider';
import {
    createUserChatClientMessageId,
    sendUserChatMessage,
    type UserChatDetail,
    type UserChatEnqueueResult,
} from '../../../../utils/userChatClient';
import {
    markPendingOutboundMessageFailed,
    queuePendingOutboundMessage,
    reassignPendingOutboundMessagesChatId,
} from './usePendingOutboundMessages';
import { serializeReplyingToSignature } from './chatReplies';
import { resolveAgentChatHistoryErrorMessage } from './resolveAgentChatHistoryErrorMessage';

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
 * Payload accepted when the user submits one durable chat turn.
 *
 * @private function of useAgentChatHistoryClientState
 */
type AgentChatHistoryUserTurnPayload = {
    message: string;
    attachments?: ChatMessage['attachments'];
    parameters?: Record<string, unknown>;
    clientMessageId?: string;
    replyingTo?: ChatMessage['replyingTo'];
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
 * Inputs required to orchestrate durable user-turn submission and retry handling.
 *
 * @private function of useAgentChatHistoryClientState
 */
type UseAgentChatHistorySubmissionStateProps = {
    readonly agentName: string;
    readonly shouldUseHistory: boolean;
    readonly activeMessages: ReadonlyArray<ChatMessage>;
    readonly activeChatIdRef: { current: string | null };
    readonly activeDraftDirtyRef: { current: boolean };
    readonly isActiveDraftUserOwnedRef: { current: boolean };
    readonly setActiveChatDraftMessage: (draftMessage: string) => void;
    readonly applyChatDetail: ApplyAgentChatDetail;
    readonly resolveDurableChatId: (chatId: string) => Promise<string>;
    readonly resolveFailedSendRecord: (chatId: string, signature: string) => FailedSendRecord | null;
    readonly rememberFailedSendRecord: (chatId: string, record: FailedSendRecord) => void;
    readonly clearFailedSendRecord: (chatId: string, signature: string) => void;
    readonly reassignFailedSendRecordsToChatId: (fromChatId: string, toChatId: string) => void;
    readonly maybePromptAfterUserMessageGesture: () => void;
    readonly rememberDefaultOffHintShown: () => Promise<boolean>;
    readonly setNotificationsEnabled: (enabled: boolean) => Promise<boolean>;
    readonly t: ReturnType<typeof useServerLanguage>['t'];
};

/**
 * Submission handlers returned to the durable chat-history shell.
 *
 * @private function of useAgentChatHistoryClientState
 */
type UseAgentChatHistorySubmissionStateResult = {
    readonly handleAutoExecuteMessagePending: (payload: {
        chatId: string;
        clientMessageId: string;
        message: string;
        attachments?: ChatMessage['attachments'];
    }) => void;
    readonly handleSubmitUserTurn: (payload: AgentChatHistoryUserTurnPayload) => Promise<void>;
};

/**
 * Keeps durable user-turn submission, failed-send retries, and notification hints focused on one clear state slice.
 *
 * @private function of useAgentChatHistoryClientState
 */
export function useAgentChatHistorySubmissionState({
    agentName,
    shouldUseHistory,
    activeMessages,
    activeChatIdRef,
    activeDraftDirtyRef,
    isActiveDraftUserOwnedRef,
    setActiveChatDraftMessage,
    applyChatDetail,
    resolveDurableChatId,
    resolveFailedSendRecord,
    rememberFailedSendRecord,
    clearFailedSendRecord,
    reassignFailedSendRecordsToChatId,
    maybePromptAfterUserMessageGesture,
    rememberDefaultOffHintShown,
    setNotificationsEnabled,
    t,
}: UseAgentChatHistorySubmissionStateProps): UseAgentChatHistorySubmissionStateResult {
    const submitUserTurnQueueRef = useRef<Promise<void>>(Promise.resolve());
    const [pendingNotificationHintAssistantMessageIds, setPendingNotificationHintAssistantMessageIds] = useState<
        Array<string>
    >([]);

    const clearPendingNotificationHintAssistantMessageIds = useCallback(() => {
        setPendingNotificationHintAssistantMessageIds([]);
    }, []);

    const rememberPendingNotificationHintAssistantMessageId = useCallback((assistantMessageId: string) => {
        setPendingNotificationHintAssistantMessageIds((assistantMessageIds) =>
            assistantMessageIds.includes(assistantMessageId)
                ? assistantMessageIds
                : [...assistantMessageIds, assistantMessageId],
        );
    }, []);

    useEffect(() => {
        return maybeShowNotificationsHint({
            activeMessages,
            pendingNotificationHintAssistantMessageIds,
            rememberDefaultOffHintShown,
            setNotificationsEnabled,
            t,
            clearPendingNotificationHintAssistantMessageIds,
        });
    }, [
        activeMessages,
        clearPendingNotificationHintAssistantMessageIds,
        pendingNotificationHintAssistantMessageIds,
        rememberDefaultOffHintShown,
        setNotificationsEnabled,
        t,
    ]);

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

    const handleSubmitUserTurn = useCallback(
        async (payload: AgentChatHistoryUserTurnPayload) => {
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
            activeChatIdRef,
            activeDraftDirtyRef,
            agentName,
            applyChatDetail,
            clearFailedSendRecord,
            isActiveDraftUserOwnedRef,
            maybePromptAfterUserMessageGesture,
            reassignFailedSendRecordsToChatId,
            rememberFailedSendRecord,
            rememberPendingNotificationHintAssistantMessageId,
            resolveDurableChatId,
            resolveFailedSendRecord,
            setActiveChatDraftMessage,
            shouldUseHistory,
        ],
    );

    return {
        handleAutoExecuteMessagePending,
        handleSubmitUserTurn,
    };
}

/**
 * Shows the default-off browser notification hint once a tracked assistant reply completes.
 *
 * @private function of useAgentChatHistoryClientState
 */
function maybeShowNotificationsHint(params: {
    activeMessages: ReadonlyArray<ChatMessage>;
    pendingNotificationHintAssistantMessageIds: ReadonlyArray<string>;
    rememberDefaultOffHintShown: () => Promise<boolean>;
    setNotificationsEnabled: (enabled: boolean) => Promise<boolean>;
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
 * Resolves one outbound client message id, preferring retries of the same payload signature.
 *
 * @private function of useAgentChatHistoryClientState
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
 * Builds a stable signature for one outbound user-message payload.
 *
 * @private function of useAgentChatHistoryClientState
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
 * Applies local state updates after one durable send succeeds.
 *
 * @private function of useAgentChatHistoryClientState
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
    applyChatDetail: ApplyAgentChatDetail;
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
 *
 * @private function of useAgentChatHistoryClientState
 */
function handleFailedUserTurnSubmission(params: {
    error: unknown;
    currentActiveChatId: string;
    resolvedChatId: string;
    signature: string;
    clientMessageId: string;
    rememberFailedSendRecord: (chatId: string, record: FailedSendRecord) => void;
}): void {
    const { error, currentActiveChatId, resolvedChatId, signature, clientMessageId, rememberFailedSendRecord } = params;

    const failedSend: FailedSendRecord = {
        signature,
        clientMessageId,
    };
    const errorMessage = resolveAgentChatHistoryErrorMessage(error, 'Failed to send chat message.');
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
 *
 * @private function of useAgentChatHistoryClientState
 */
async function submitQueuedUserTurn(params: {
    agentName: string;
    currentActiveChatId: string;
    payload: AgentChatHistoryUserTurnPayload;
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
    applyChatDetail: ApplyAgentChatDetail;
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
        });
        throw error;
    }
}
