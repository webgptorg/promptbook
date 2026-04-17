'use client';

import { usePromise } from '@common/hooks/usePromise';
import { RemoteAgent } from '@promptbook-local/core';
import type { ChatMessage } from '@promptbook-local/types';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { spaceTrim } from 'spacetrim';
import { usePrivateModePreferences } from '../../../../components/PrivateModePreferences/PrivateModePreferencesProvider';
import { useSelfLearningPreferences } from '../../../../components/SelfLearningPreferences/SelfLearningPreferencesProvider';
import { useServerLanguage } from '../../../../components/ServerLanguage/ServerLanguageProvider';
import { useActiveBrowserTab } from '../../../../hooks/useActiveBrowserTab';
import { fetchCalendarOAuthStatus, type CalendarOAuthStatusResponse } from '../../../../utils/calendarOAuthClient';
import { fetchGithubAppStatus, type GithubAppStatusResponse } from '../../../../utils/githubAppClient';
import { createUserChatClientMessageId } from '../../../../utils/userChatClient';
import {
    serializeUserLocationPromptParameter,
    USER_LOCATION_PROMPT_PARAMETER,
} from '../../../../utils/userLocationPromptParameter';
import { useAgentChatMetaDisclaimer } from '../useAgentChatMetaDisclaimer';
import { useAgentChatToolInteractions } from '../useAgentChatToolInteractions';
import { useTeamAgentProfiles } from '../useTeamAgentProfiles';
import { createReplyingToSnapshot, isReplyableCanonicalChatMessage } from './chatReplies';
import { useCanonicalChatMessages } from './useCanonicalChatMessages';
import { queuePendingOutboundMessage } from './usePendingOutboundMessages';

/**
 * Parameters accepted by the server-backed chat submit handler.
 *
 * @private function of CanonicalAgentChatPanel
 */
type SubmitUserTurnPayload = {
    message: string;
    attachments?: ChatMessage['attachments'];
    parameters?: Record<string, unknown>;
    clientMessageId?: string;
    replyingTo?: ChatMessage['replyingTo'];
};

/**
 * Submit handler shared by the canonical durable-chat panel flows.
 *
 * @private function of CanonicalAgentChatPanel
 */
type SubmitUserTurn = (payload: SubmitUserTurnPayload) => Promise<void>;

/**
 * Feedback payload received from the shared chat component.
 *
 * @private function of CanonicalAgentChatPanel
 */
type CanonicalAgentChatFeedback = {
    message: ChatMessage;
    rating: number;
    textRating: string;
    chatThread: string;
    expectedAnswer: string | null;
    url: string;
};

/**
 * Inputs required to orchestrate the canonical durable-chat panel state.
 *
 * @private function of CanonicalAgentChatPanel
 */
type UseCanonicalAgentChatPanelStateOptions = {
    readonly chatId: string;
    readonly agentName: string;
    readonly agentUrl: string;
    readonly initialAgentMessage?: string | null;
    readonly isReadOnly: boolean;
    readonly messages: ReadonlyArray<ChatMessage>;
    readonly thinkingMessages?: ReadonlyArray<string>;
    readonly autoExecuteMessage?: string;
    readonly autoExecuteMessageAttachments?: ChatMessage['attachments'];
    readonly autoExecuteClientMessageId?: string;
    readonly onSubmitUserTurn: SubmitUserTurn;
    readonly onAutoExecuteMessagePending?: (payload: {
        chatId: string;
        clientMessageId: string;
        message: string;
        attachments?: ChatMessage['attachments'];
    }) => void;
    readonly onAutoExecuteMessageConsumed?: () => void;
};

/**
 * Browser-facing message send callback used by the shared chat surface.
 *
 * @private function of CanonicalAgentChatPanel
 */
type CanonicalAgentManualMessageHandler = (
    message: string,
    attachments?: ChatMessage['attachments'],
    replyingToMessageOverride?: ChatMessage | null,
    clientMessageId?: string,
) => Promise<void>;

/**
 * State consumed by the extracted canonical chat surface and dialog shells.
 *
 * @private function of CanonicalAgentChatPanel
 */
export type CanonicalAgentChatPanelState = {
    readonly surface: {
        readonly agentAvatarSrc: string;
        readonly agentDisplayName: string;
        readonly elevenLabsVoiceId: string | undefined;
        readonly initialMessage: string | undefined;
        readonly isSpeechPlaybackEnabled: boolean;
        readonly onCancelReply: () => void;
        readonly onFeedback: (feedback: CanonicalAgentChatFeedback) => Promise<void>;
        readonly onManualMessage: CanonicalAgentManualMessageHandler;
        readonly onQuickMessageButton: (message: string) => Promise<void>;
        readonly onStartReply: (message: ChatMessage) => void;
        readonly renderedMessages: ReadonlyArray<ChatMessage>;
        readonly replyingToMessage: ChatMessage | null;
        readonly teamAgentProfiles: ReturnType<typeof useTeamAgentProfiles>;
    };
    readonly dialogs: {
        readonly metaDisclaimer: {
            readonly errorMessage: ReturnType<typeof useAgentChatMetaDisclaimer>['metaDisclaimerError'];
            readonly isAccepting: boolean;
            readonly markdown: ReturnType<typeof useAgentChatMetaDisclaimer>['metaDisclaimerMarkdown'];
            readonly onAccept: () => void;
            readonly onRetry: () => void;
            readonly shouldRender: boolean;
        };
        readonly pseudoUser: {
            readonly agentName: string;
            readonly isOpen: boolean;
            readonly onClose: ReturnType<typeof useAgentChatToolInteractions>['handlePseudoUserReplyClose'];
            readonly onSubmit: ReturnType<typeof useAgentChatToolInteractions>['handlePseudoUserReplySubmit'];
            readonly prompt: string;
            readonly userName: string;
        };
        readonly walletRecord: {
            readonly calendarOAuth: {
                readonly agentPermanentId: string;
                readonly isConfigured: boolean;
            };
            readonly githubApp: {
                readonly agentPermanentId: string;
                readonly isConfigured: boolean;
            };
            readonly isOpen: boolean;
            readonly onClose: ReturnType<typeof useAgentChatToolInteractions>['handleWalletRequestClose'];
            readonly onSubmit: ReturnType<typeof useAgentChatToolInteractions>['handleWalletRequestSubmit'];
            readonly request: ReturnType<typeof useAgentChatToolInteractions>['pendingWalletRequest'];
        };
    };
};

/**
 * Keeps `CanonicalAgentChatPanel` focused on composition while centralizing durable-chat state orchestration.
 *
 * @private function of CanonicalAgentChatPanel
 */
export function useCanonicalAgentChatPanelState(
    options: UseCanonicalAgentChatPanelStateOptions,
): CanonicalAgentChatPanelState {
    const {
        chatId,
        agentName,
        agentUrl,
        initialAgentMessage,
        isReadOnly,
        messages,
        thinkingMessages,
        autoExecuteMessage,
        autoExecuteMessageAttachments,
        autoExecuteClientMessageId,
        onSubmitUserTurn,
        onAutoExecuteMessagePending,
        onAutoExecuteMessageConsumed,
    } = options;
    const agentPromise = useMemo(
        () =>
            RemoteAgent.connect({
                agentUrl,
                isVerbose: true,
            }),
        [agentUrl],
    );
    const { value: agent } = usePromise(agentPromise, [agentPromise]);
    const currentAgentPermanentId = useMemo(() => resolveCurrentAgentPermanentId(agent, agentName), [agent, agentName]);
    const { githubAppStatus, calendarOAuthStatus } = useCanonicalAgentIntegrationStatuses(currentAgentPermanentId);
    const teamAgentProfiles = useTeamAgentProfiles(agent?.capabilities);
    const { isSelfLearningEnabled } = useSelfLearningPreferences();
    const { isPrivateModeEnabled, setIsPrivateModeEnabled } = usePrivateModePreferences();
    const { t: translateText } = useServerLanguage();
    const isActiveBrowserTab = useActiveBrowserTab();
    const effectiveSelfLearningEnabled = isSelfLearningEnabled && !isPrivateModeEnabled;
    const {
        isMetaDisclaimerAccepting,
        metaDisclaimerError,
        metaDisclaimerMarkdown,
        shouldRenderMetaDisclaimerDialog,
        effectiveAutoExecuteMessage,
        effectiveAutoExecuteMessageAttachments,
        loadMetaDisclaimerStatus,
        handleAcceptMetaDisclaimer,
    } = useAgentChatMetaDisclaimer({
        agentName,
        autoExecuteMessage,
        autoExecuteMessageAttachments,
        onAutoExecuteMessageConsumed,
    });
    const promptParameters = useMemo<Record<string, unknown>>(
        () => ({
            selfLearningEnabled: effectiveSelfLearningEnabled,
        }),
        [effectiveSelfLearningEnabled],
    );
    const sendPromptbookMessage = useCallback(
        (message: string) => {
            if (isReadOnly) {
                return;
            }

            void onSubmitUserTurn({
                message,
                parameters: promptParameters,
            });
        },
        [isReadOnly, onSubmitUserTurn, promptParameters],
    );
    const {
        userLocationPromptParameter,
        pendingPseudoUserInteraction,
        pendingWalletRequest,
        handleMessagesChange,
        handlePseudoUserReplySubmit,
        handlePseudoUserReplyClose,
        handleWalletRequestSubmit,
        handleWalletRequestClose,
    } = useAgentChatToolInteractions({
        agent,
        sendMessage: sendPromptbookMessage,
        currentAgentPermanentId,
        isPrivateModeEnabled,
        setIsPrivateModeEnabled,
        t: translateText,
    });
    const effectivePromptParameters = useMemo(() => {
        if (!userLocationPromptParameter) {
            return promptParameters;
        }

        return {
            ...promptParameters,
            [USER_LOCATION_PROMPT_PARAMETER]: serializeUserLocationPromptParameter(userLocationPromptParameter),
        };
    }, [promptParameters, userLocationPromptParameter]);
    const handleFeedback = useCallback(
        async (feedback: CanonicalAgentChatFeedback): Promise<void> => {
            if (!agent) {
                throw new Error('Agent is not ready to receive feedback.');
            }

            const response = await fetch(`${agentUrl}/api/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    rating: feedback.rating.toString(),
                    textRating: feedback.textRating,
                    chatThread: feedback.chatThread,
                    userNote: feedback.textRating,
                    expectedAnswer: feedback.expectedAnswer,
                    agentHash: agent.agentHash,
                }),
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as { message?: string } | null;
                throw new Error(payload?.message ?? 'Failed to save feedback.');
            }
        },
        [agent, agentUrl],
    );
    const [replyingToMessageId, setReplyingToMessageId] = useState<string | null>(null);
    const handleManualMessage = useCallback<CanonicalAgentManualMessageHandler>(
        async (message, attachments, replyingToMessageOverride, clientMessageId) => {
            if (isReadOnly) {
                return;
            }

            await onSubmitUserTurn({
                message,
                attachments,
                parameters: effectivePromptParameters,
                clientMessageId,
                replyingTo: replyingToMessageOverride
                    ? createReplyingToSnapshot(chatId, replyingToMessageOverride)
                    : undefined,
            });
        },
        [chatId, effectivePromptParameters, isReadOnly, onSubmitUserTurn],
    );
    const handleQuickMessageButton = useCallback(
        async (message: string) => {
            if (isReadOnly) {
                return;
            }

            const clientMessageId = createUserChatClientMessageId();
            queuePendingOutboundMessage({
                chatId,
                clientMessageId,
                content: message,
            });

            await onSubmitUserTurn({
                message,
                parameters: effectivePromptParameters,
                clientMessageId,
            });
            setReplyingToMessageId(null);
        },
        [chatId, effectivePromptParameters, isReadOnly, onSubmitUserTurn],
    );

    useEffect(() => {
        handleMessagesChange(messages);
    }, [handleMessagesChange, messages]);

    useCanonicalAgentAutoExecution({
        chatId,
        isReadOnly,
        autoExecuteMessage,
        autoExecuteMessageAttachments,
        autoExecuteClientMessageId,
        effectiveAutoExecuteMessage,
        effectiveAutoExecuteMessageAttachments,
        onAutoExecuteMessagePending,
        onManualMessage: handleManualMessage,
    });

    const agentDisplayName = useMemo(() => resolveAgentDisplayName(agent, agentName), [agent, agentName]);
    const agentAvatarSrc = useMemo(() => resolveAgentAvatarSrc(agent, agentUrl), [agent, agentUrl]);
    const fallbackInitialMessage = useMemo(() => createFallbackInitialMessage(agentDisplayName), [agentDisplayName]);
    const resolvedConfiguredInitialMessage = useMemo(() => {
        if (initialAgentMessage !== undefined) {
            return initialAgentMessage;
        }

        return agent?.initialMessage;
    }, [agent, initialAgentMessage]);
    const initialMessage = useMemo(
        () => resolveInitialMessage(resolvedConfiguredInitialMessage, fallbackInitialMessage),
        [fallbackInitialMessage, resolvedConfiguredInitialMessage],
    );
    const renderedMessages = useCanonicalChatMessages({
        initialMessage,
        isInitialMessageResolved: initialMessage !== undefined,
        messages,
        thinkingMessages,
        isActiveBrowserTab,
    });
    const replyingToMessage = useMemo(
        () =>
            renderedMessages.find(
                (message) => message.id === replyingToMessageId && isReplyableCanonicalChatMessage(message),
            ) || null,
        [renderedMessages, replyingToMessageId],
    );
    const handleStartReply = useCallback(
        (message: ChatMessage) => {
            if (
                isReadOnly ||
                !isReplyableCanonicalChatMessage(message) ||
                typeof message.id !== 'string' ||
                message.id.length === 0
            ) {
                return;
            }

            setReplyingToMessageId(message.id);
        },
        [isReadOnly],
    );
    const handleCancelReply = useCallback(() => {
        setReplyingToMessageId(null);
    }, []);

    useEffect(() => {
        if (replyingToMessageId && !replyingToMessage) {
            setReplyingToMessageId(null);
        }
    }, [replyingToMessage, replyingToMessageId]);

    return {
        surface: {
            agentAvatarSrc,
            agentDisplayName,
            elevenLabsVoiceId: agent?.meta.voice,
            initialMessage,
            isSpeechPlaybackEnabled: agent?.isVoiceTtsSttEnabled ?? false,
            onCancelReply: handleCancelReply,
            onFeedback: handleFeedback,
            onManualMessage: handleManualMessage,
            onQuickMessageButton: handleQuickMessageButton,
            onStartReply: handleStartReply,
            renderedMessages,
            replyingToMessage,
            teamAgentProfiles,
        },
        dialogs: {
            metaDisclaimer: {
                errorMessage: metaDisclaimerError,
                isAccepting: isMetaDisclaimerAccepting,
                markdown: metaDisclaimerMarkdown,
                onAccept: () => {
                    void handleAcceptMetaDisclaimer();
                },
                onRetry: () => {
                    void loadMetaDisclaimerStatus();
                },
                shouldRender: shouldRenderMetaDisclaimerDialog,
            },
            pseudoUser: {
                agentName: pendingPseudoUserInteraction?.agentName || 'Agent',
                isOpen: pendingPseudoUserInteraction !== null,
                onClose: handlePseudoUserReplyClose,
                onSubmit: handlePseudoUserReplySubmit,
                prompt: pendingPseudoUserInteraction?.prompt || '',
                userName: pendingPseudoUserInteraction?.teammateLabel || 'User',
            },
            walletRecord: {
                calendarOAuth: {
                    isConfigured: calendarOAuthStatus?.isConfigured === true,
                    agentPermanentId: currentAgentPermanentId,
                },
                githubApp: {
                    isConfigured: githubAppStatus?.isConfigured === true,
                    agentPermanentId: currentAgentPermanentId,
                },
                isOpen: pendingWalletRequest !== null,
                onClose: handleWalletRequestClose,
                onSubmit: handleWalletRequestSubmit,
                request: pendingWalletRequest,
            },
        },
    };
}

/**
 * Integration-status state returned for the wallet dialog shell.
 *
 * @private function of CanonicalAgentChatPanel
 */
type CanonicalAgentIntegrationStatuses = {
    githubAppStatus: GithubAppStatusResponse | null;
    calendarOAuthStatus: CalendarOAuthStatusResponse | null;
};

/**
 * Loads the external integration status required by wallet-backed chat tools.
 *
 * @private function of CanonicalAgentChatPanel
 */
function useCanonicalAgentIntegrationStatuses(agentPermanentId: string): CanonicalAgentIntegrationStatuses {
    const [githubAppStatus, setGithubAppStatus] = useState<GithubAppStatusResponse | null>(null);
    const [calendarOAuthStatus, setCalendarOAuthStatus] = useState<CalendarOAuthStatusResponse | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadIntegrationStatus = async () => {
            const [nextGithubAppStatus, nextCalendarOAuthStatus] = await Promise.all([
                fetchGithubAppStatus(),
                fetchCalendarOAuthStatus(agentPermanentId),
            ]);

            if (!isMounted) {
                return;
            }

            setGithubAppStatus(nextGithubAppStatus);
            setCalendarOAuthStatus(nextCalendarOAuthStatus);
        };

        void loadIntegrationStatus();

        return () => {
            isMounted = false;
        };
    }, [agentPermanentId]);

    return {
        githubAppStatus,
        calendarOAuthStatus,
    };
}

/**
 * Inputs accepted by the auto-execution orchestration hook.
 *
 * @private function of CanonicalAgentChatPanel
 */
type UseCanonicalAgentAutoExecutionOptions = {
    readonly chatId: string;
    readonly isReadOnly: boolean;
    readonly autoExecuteMessage?: string;
    readonly autoExecuteMessageAttachments?: ChatMessage['attachments'];
    readonly autoExecuteClientMessageId?: string;
    readonly effectiveAutoExecuteMessage?: string;
    readonly effectiveAutoExecuteMessageAttachments?: ChatMessage['attachments'];
    readonly onAutoExecuteMessagePending?: (payload: {
        chatId: string;
        clientMessageId: string;
        message: string;
        attachments?: ChatMessage['attachments'];
    }) => void;
    readonly onManualMessage: CanonicalAgentManualMessageHandler;
};

/**
 * Keeps optimistic auto-execute bubbles and the durable send request on one stable client message id.
 *
 * @private function of CanonicalAgentChatPanel
 */
function useCanonicalAgentAutoExecution(options: UseCanonicalAgentAutoExecutionOptions): void {
    const {
        chatId,
        isReadOnly,
        autoExecuteMessage,
        autoExecuteMessageAttachments,
        autoExecuteClientMessageId,
        effectiveAutoExecuteMessage,
        effectiveAutoExecuteMessageAttachments,
        onAutoExecuteMessagePending,
        onManualMessage,
    } = options;
    const hasAutoExecutedRef = useRef(false);
    const hasSeededAutoExecutePendingMessageRef = useRef(false);
    const autoExecuteClientMessageIdRef = useRef<string | undefined>(undefined);
    const lastAutoExecutePayloadRef = useRef<string | undefined>(
        serializeAutoExecutePayload(autoExecuteMessage, autoExecuteMessageAttachments, autoExecuteClientMessageId),
    );

    useEffect(() => {
        const nextAutoExecutePayload = serializeAutoExecutePayload(
            autoExecuteMessage,
            autoExecuteMessageAttachments,
            autoExecuteClientMessageId,
        );
        if (lastAutoExecutePayloadRef.current === nextAutoExecutePayload) {
            return;
        }

        lastAutoExecutePayloadRef.current = nextAutoExecutePayload;
        hasAutoExecutedRef.current = false;
        hasSeededAutoExecutePendingMessageRef.current = false;
        autoExecuteClientMessageIdRef.current = undefined;
    }, [autoExecuteClientMessageId, autoExecuteMessage, autoExecuteMessageAttachments]);

    const resolveAutoExecuteClientMessageId = useCallback((): string => {
        if (!autoExecuteClientMessageIdRef.current) {
            autoExecuteClientMessageIdRef.current = autoExecuteClientMessageId || createUserChatClientMessageId();
        }

        return autoExecuteClientMessageIdRef.current;
    }, [autoExecuteClientMessageId]);

    const shouldAutoExecute =
        (Boolean(effectiveAutoExecuteMessage) || Boolean(effectiveAutoExecuteMessageAttachments?.length)) &&
        !hasAutoExecutedRef.current &&
        !isReadOnly;

    useLayoutEffect(() => {
        if (!shouldAutoExecute || hasSeededAutoExecutePendingMessageRef.current) {
            return;
        }

        hasSeededAutoExecutePendingMessageRef.current = true;
        onAutoExecuteMessagePending?.({
            chatId,
            clientMessageId: resolveAutoExecuteClientMessageId(),
            message: effectiveAutoExecuteMessage ?? '',
            attachments: effectiveAutoExecuteMessageAttachments,
        });
    }, [
        chatId,
        effectiveAutoExecuteMessage,
        effectiveAutoExecuteMessageAttachments,
        onAutoExecuteMessagePending,
        resolveAutoExecuteClientMessageId,
        shouldAutoExecute,
    ]);

    useEffect(() => {
        if (!shouldAutoExecute) {
            return;
        }

        hasAutoExecutedRef.current = true;
        void onManualMessage(
            effectiveAutoExecuteMessage ?? '',
            effectiveAutoExecuteMessageAttachments,
            undefined,
            resolveAutoExecuteClientMessageId(),
        ).catch(() => undefined);
    }, [
        effectiveAutoExecuteMessage,
        effectiveAutoExecuteMessageAttachments,
        onManualMessage,
        resolveAutoExecuteClientMessageId,
        shouldAutoExecute,
    ]);
}

/**
 * Serialized auto-execute payload marker used to deduplicate dispatches.
 *
 * @private function of CanonicalAgentChatPanel
 */
function serializeAutoExecutePayload(
    message?: string,
    attachments?: ChatMessage['attachments'],
    clientMessageId?: string,
): string {
    const normalizedMessage = message ?? '';
    const normalizedAttachments = attachments && attachments.length > 0 ? JSON.stringify(attachments) : '';
    return `${normalizedMessage}|${normalizedAttachments}|${clientMessageId || ''}`;
}

/**
 * Resolves the canonical permanent id used by wallet/calendar integrations.
 *
 * @private function of CanonicalAgentChatPanel
 */
function resolveCurrentAgentPermanentId(agent: RemoteAgent | null | undefined, agentName: string): string {
    return typeof (agent as { permanentId?: unknown } | undefined)?.permanentId === 'string'
        ? ((agent as { permanentId?: string }).permanentId as string)
        : agentName;
}

/**
 * Resolves the display name shared across chat title, participants, and fallback copy.
 *
 * @private function of CanonicalAgentChatPanel
 */
function resolveAgentDisplayName(agent: RemoteAgent | null | undefined, agentName: string): string {
    return agent?.meta.fullname || agent?.agentName || agentName;
}

/**
 * Resolves the avatar shown for the agent participant in the chat thread.
 *
 * @private function of CanonicalAgentChatPanel
 */
function resolveAgentAvatarSrc(agent: RemoteAgent | null | undefined, agentUrl: string): string {
    return agent?.meta.image || `${agentUrl}/images/default-avatar.png`;
}

/**
 * Creates the generic fallback greeting used only when an agent has no configured initial message.
 *
 * @private function of CanonicalAgentChatPanel
 */
function createFallbackInitialMessage(agentDisplayName: string): string {
    return spaceTrim(`
        Hello! I am ${agentDisplayName}.

        [Hello](?message=Hello, can you tell me about yourself?)
    `);
}

/**
 * Resolves the effective initial message while preserving the loading state until configuration is known.
 *
 * @private function of CanonicalAgentChatPanel
 */
function resolveInitialMessage(
    configuredInitialMessage: string | null | undefined,
    fallbackInitialMessage: string,
): string | undefined {
    if (configuredInitialMessage === undefined) {
        return undefined;
    }

    return hasInitialMessageContent(configuredInitialMessage) ? configuredInitialMessage : fallbackInitialMessage;
}

/**
 * Returns true when one resolved initial message contains visible text.
 *
 * @private function of CanonicalAgentChatPanel
 */
function hasInitialMessageContent(initialMessage: string | null | undefined): initialMessage is string {
    return typeof initialMessage === 'string' && initialMessage.trim().length > 0;
}
