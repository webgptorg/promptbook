'use client';

import {
    WalletRecordDialog,
    type PendingWalletRecordRequest,
    type WalletRecordDialogSubmitPayload,
} from '@/src/components/WalletRecordDialog/WalletRecordDialog';
import { usePromise } from '@common/hooks/usePromise';
import { AgentChat, ChatMessage, useSendMessageToLlmChat } from '@promptbook-local/components';
import { RemoteAgent } from '@promptbook-local/core';
import type { ToolCall } from '@promptbook-local/types';
import { ClientVersionMismatchError } from '@promptbook-local/utils';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { OpenAiSpeechRecognition } from '../../../../../../src/speech-recognition/OpenAiSpeechRecognition';
import { string_agent_url } from '../../../../../../src/types/typeAliases';
import { useAgentBackground } from '../../../components/AgentProfile/useAgentBackground';
import { ChatErrorDialog } from '../../../components/ChatErrorDialog';
import { confirmPrivateModeEnable } from '../../../components/PrivateModePreferences/confirmPrivateModeEnable';
import { usePrivateModePreferences } from '../../../components/PrivateModePreferences/PrivateModePreferencesProvider';
import { useSelfLearningPreferences } from '../../../components/SelfLearningPreferences/SelfLearningPreferencesProvider';
import { useServerLanguage } from '../../../components/ServerLanguage/ServerLanguageProvider';
import { useSoundSystem } from '../../../components/SoundSystemProvider/SoundSystemProvider';
import { createDefaultChatEffects } from '../../../utils/chat/createDefaultChatEffects';
import { reportClientVersionMismatch } from '../../../utils/clientVersionClient';
import type { FriendlyErrorMessage } from '../../../utils/errorMessages';
import { handleChatError } from '../../../utils/errorMessages';
import { fetchGithubAppStatus, type GithubAppStatusResponse } from '../../../utils/githubAppClient';
import { chatFileUploadHandler } from '../../../utils/upload/createBookEditorUploadHandler';
import {
    serializeUserLocationPromptParameter,
    USER_LOCATION_PROMPT_PARAMETER,
} from '../../../utils/userLocationPromptParameter';
import { MetaDisclaimerDialog } from './MetaDisclaimerDialog';
import { PseudoUserChatDialog } from './PseudoUserChatDialog';
import { toolCallUtils } from './toolCallUtils';
import { useMetaDisclaimer } from './useMetaDisclaimer';
import { useTeamAgentProfiles } from './useTeamAgentProfiles';
import { useUserLocationPromptParameter } from './useUserLocationPromptParameter';

type AgentChatWrapperProps = {
    agentName: string;
    agentUrl: string_agent_url;
    defaultMessage?: string;
    autoExecuteMessage?: string;
    autoExecuteMessageAttachments?: ChatMessage['attachments'];
    brandColor?: string;
    thinkingMessages?: ReadonlyArray<string>;
    speechRecognitionLanguage?: string;
    persistenceKey?: string;
    onMessagesChange?: (messages: ReadonlyArray<ChatMessage>) => void;
    /**
     * Optional handler for input field text changes (draft message persistence).
     */
    onInputTextChange?: (messageContent: string) => void;
    /**
     * When `false`, disables the chat upload UI even if file uploads are otherwise configured.
     */
    areFileAttachmentsEnabled?: boolean;
    /**
     * When `false`, hides the feedback UI (star button) inside the chat.
     */
    isFeedbackEnabled?: boolean;
    chatFailMessage?: string;
    /**
     * Optional handler for "New chat" action emitted from chat action bar.
     *
     * When provided, wrapper delegates reset behavior to the caller so the
     * current chat can stay immutable and a fresh chat can be created instead.
     */
    onStartNewChat?: () => Promise<void> | void;
    /**
     * Called once when an auto-execute message becomes eligible for dispatch.
     */
    onAutoExecuteMessageConsumed?: () => void;
};

/**
 * Serializes the auto-execute payload for change detection.
 */
function serializeAutoExecutePayload(message?: string, attachments?: ChatMessage['attachments']): string {
    const normalizedMessage = message ?? '';
    if (!attachments || attachments.length === 0) {
        return normalizedMessage;
    }

    try {
        return `${normalizedMessage}|${JSON.stringify(attachments)}`;
    } catch {
        return normalizedMessage;
    }
}

const {
    buildPendingWalletRequest,
    createToolCallMarker,
    findNewestMatchingToolCall,
    getPseudoUserLabel,
    getPseudoUserPromptText,
    shouldRequestBrowserUserLocation,
    shouldRequestPrivateModeEnable,
    shouldRequestPseudoUserReply,
    shouldRequestWalletCredential,
    shouldRequestWalletRecord,
} = toolCallUtils;

/**
 * Location tool result payload shape.
 */
/**
 * Pending pseudo-user interaction extracted from TEAM tool result.
 */
type PendingPseudoUserInteraction = {
    /**
     * Stable tool-call marker used for deduplication.
     */
    marker: string;
    /**
     * Prompt text shown inside the modal.
     */
    prompt: string;
    /**
     * Display name of the speaking agent.
     */
    agentName: string;
    /**
     * Display label of the pseudo teammate (`User`).
     */
    teammateLabel: string;
};

// TODO: [🐱‍🚀] Rename to AgentChatSomethingWrapper

export function AgentChatWrapper(props: AgentChatWrapperProps) {
    const {
        agentName,
        agentUrl,
        defaultMessage,
        autoExecuteMessage,
        autoExecuteMessageAttachments,
        brandColor,
        thinkingMessages,
        speechRecognitionLanguage,
        persistenceKey,
        onMessagesChange,
        onInputTextChange,
        areFileAttachmentsEnabled,
        isFeedbackEnabled,
        chatFailMessage,
        onStartNewChat,
        onAutoExecuteMessageConsumed,
    } = props;

    const shouldEnableFeedback = isFeedbackEnabled ?? true;
    const { backgroundImage, brandColorHex, brandColorLightHex, brandColorDarkHex } = useAgentBackground(brandColor);
    const allowFileAttachments = areFileAttachmentsEnabled ?? true;

    const chatBackgroundStyle: CSSProperties & Record<string, string> = {
        backgroundImage: `url("${backgroundImage}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        '--agent-chat-brand-color': brandColorHex,
        '--agent-chat-brand-color-light': brandColorLightHex,
        '--agent-chat-brand-color-dark': brandColorDarkHex,
    };

    const agentPromise = useMemo(
        () =>
            RemoteAgent.connect({
                agentUrl,
                isVerbose: true,
            }),
        [agentUrl],
    );

    const { value: agent } = usePromise(agentPromise, [agentPromise]);
    const teamAgentProfiles = useTeamAgentProfiles(agent?.capabilities);

    // Error state management
    const [currentError, setCurrentError] = useState<FriendlyErrorMessage | null>(null);
    const [retryCallback, setRetryCallback] = useState<(() => void) | null>(null);
    const [chatKey, setChatKey] = useState<number>(0);
    const { userLocationPromptParameter, requestBrowserUserLocation } =
        useUserLocationPromptParameter();
    const {
        status: metaDisclaimerStatus,
        isLoading: isMetaDisclaimerLoading,
        isAccepting: isMetaDisclaimerAccepting,
        errorMessage: metaDisclaimerError,
        reload: loadMetaDisclaimerStatus,
        accept: handleAcceptMetaDisclaimer,
    } = useMetaDisclaimer(agentName);
    const sendMessage = useSendMessageToLlmChat();
    const isPrivacyConfirmationInFlightRef = useRef(false);
    const handledLocationToolCallMarkersRef = useRef<Set<string>>(new Set());
    const handledPrivacyToolCallMarkersRef = useRef<Set<string>>(new Set());
    const handledPseudoUserToolCallMarkersRef = useRef<Set<string>>(new Set());
    const handledWalletToolCallMarkersRef = useRef<Set<string>>(new Set());
    const [pendingPseudoUserInteraction, setPendingPseudoUserInteraction] =
        useState<PendingPseudoUserInteraction | null>(null);
    const [pendingWalletRequest, setPendingWalletRequest] = useState<PendingWalletRecordRequest | null>(null);
    const [githubAppStatus, setGithubAppStatus] = useState<GithubAppStatusResponse | null>(null);
    const hasReportedAutoExecuteMessageRef = useRef(false);
    const lastAutoExecutePayloadRef = useRef<string | undefined>(
        serializeAutoExecutePayload(autoExecuteMessage, autoExecuteMessageAttachments),
    );
    const currentAgentPermanentId = useMemo(() => {
        return typeof (agent as { permanentId?: unknown } | undefined)?.permanentId === 'string'
            ? ((agent as { permanentId?: string }).permanentId as string)
            : undefined;
    }, [agent]);

    /**
     * Loads GitHub App availability so wallet popup can offer one-click connect.
     */
    useEffect(() => {
        let isMounted = true;

        const loadGithubAppStatus = async () => {
            const status = await fetchGithubAppStatus();
            if (!isMounted) {
                return;
            }

            setGithubAppStatus(status);
        };

        void loadGithubAppStatus();

        return () => {
            isMounted = false;
        };
    }, []);

    const isMetaDisclaimerEnabled = metaDisclaimerStatus?.enabled === true;
    const hasAcceptedMetaDisclaimer = isMetaDisclaimerEnabled ? metaDisclaimerStatus?.accepted === true : true;
    const isMetaDisclaimerBlockingChat =
        isMetaDisclaimerLoading ||
        metaDisclaimerError !== null ||
        (isMetaDisclaimerEnabled && !hasAcceptedMetaDisclaimer);
    const shouldRenderMetaDisclaimerDialog =
        metaDisclaimerError !== null || (isMetaDisclaimerEnabled && !hasAcceptedMetaDisclaimer);
    const metaDisclaimerMarkdown = metaDisclaimerStatus?.markdown || null;
    const effectiveAutoExecuteMessage = isMetaDisclaimerBlockingChat ? undefined : autoExecuteMessage;
    const effectiveAutoExecuteMessageAttachments = isMetaDisclaimerBlockingChat
        ? undefined
        : autoExecuteMessageAttachments;
    const hasEffectiveAutoExecuteContent =
        Boolean(effectiveAutoExecuteMessage) || Boolean(effectiveAutoExecuteMessageAttachments?.length);

    useEffect(() => {
        const payload = serializeAutoExecutePayload(autoExecuteMessage, autoExecuteMessageAttachments);
        if (lastAutoExecutePayloadRef.current === payload) {
            return;
        }

        lastAutoExecutePayloadRef.current = payload;
        hasReportedAutoExecuteMessageRef.current = false;
    }, [autoExecuteMessage, autoExecuteMessageAttachments]);

    useEffect(() => {
        if (!hasEffectiveAutoExecuteContent) {
            return;
        }

        if (hasReportedAutoExecuteMessageRef.current) {
            return;
        }

        hasReportedAutoExecuteMessageRef.current = true;
        onAutoExecuteMessageConsumed?.();
    }, [hasEffectiveAutoExecuteContent, onAutoExecuteMessageConsumed]);

    const handleFeedback = useCallback(
        async (feedback: {
            message: ChatMessage;
            rating: number;
            textRating: string;
            chatThread: string;
            expectedAnswer: string | null;
            url: string;
        }): Promise<void> => {
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

    // Remove the 'message' query parameter from URL after auto-executing a message
    useEffect(() => {
        if (effectiveAutoExecuteMessage && typeof window !== 'undefined') {
            // Wait for the message to be processed, then remove the query parameter
            const timer = setTimeout(() => {
                const url = new URL(window.location.href);
                url.searchParams.delete('message');
                window.history.replaceState({}, '', url.toString());
            }, 1000); // 1 second delay to ensure message processing is complete

            return () => clearTimeout(timer);
        }
    }, [effectiveAutoExecuteMessage]);

    const handleFileUpload = useCallback(async (file: File) => {
        return chatFileUploadHandler(file);
    }, []);

    const isSpeechFeaturesEnabled = agent?.isVoiceTtsSttEnabled ?? false;
    const speechRecognition = useMemo(() => {
        if (typeof window === 'undefined' || !isSpeechFeaturesEnabled) {
            return undefined;
        }

        // Note: [🧠] We could have a mechanism to check if OPENAI_API_KEY is set on the server
        //       For now, we always provide OpenAiSpeechRecognition which uses proxy
        return new OpenAiSpeechRecognition();
    }, [isSpeechFeaturesEnabled]);

    const effectConfigs = useMemo(() => createDefaultChatEffects(), []);
    const { soundSystem } = useSoundSystem();
    const { isSelfLearningEnabled } = useSelfLearningPreferences();
    const { isPrivateModeEnabled, setIsPrivateModeEnabled } = usePrivateModePreferences();
    const { t } = useServerLanguage();
    const effectiveSelfLearningEnabled = isSelfLearningEnabled && !isPrivateModeEnabled;

    // Handle errors from chat
    const handleError = useCallback((error: unknown, retry: () => void) => {
        if (error instanceof ClientVersionMismatchError) {
            reportClientVersionMismatch({
                requiredVersion: error.requiredVersion,
                reportedVersion: error.reportedVersion,
                message: error.message,
            });
            return;
        }

        const friendlyError = handleChatError(error, 'AgentChatWrapper');
        setCurrentError(friendlyError);
        setRetryCallback(() => retry);
    }, []);

    // Handle error dialog dismiss
    const handleDismissError = useCallback(() => {
        setCurrentError(null);
        setRetryCallback(null);
    }, []);

    // Handle retry from error dialog
    const handleRetry = useCallback(() => {
        if (retryCallback) {
            retryCallback();
        }
    }, [retryCallback]);

    // Handle reset from error dialog
    const handleReset = useCallback(() => {
        setChatKey((prevKey) => prevKey + 1); // Increment key to force re-mount
    }, []);

    /**
     * Asks the user to confirm enabling private mode and enables it on confirmation.
     */
    const requestPrivateModeEnableConfirmation = useCallback(async () => {
        if (isPrivateModeEnabled || isPrivacyConfirmationInFlightRef.current) {
            return;
        }

        isPrivacyConfirmationInFlightRef.current = true;

        try {
            const isConfirmed = await confirmPrivateModeEnable(t);
            if (!isConfirmed) {
                return;
            }

            setIsPrivateModeEnabled(true);
        } finally {
            isPrivacyConfirmationInFlightRef.current = false;
        }
    }, [isPrivateModeEnabled, setIsPrivateModeEnabled, t]);

    /**
     * Finds the newest location-tool call that asks for browser location.
     */
    const findPendingLocationToolCall = useCallback((messages: ReadonlyArray<ChatMessage>): ToolCall | null => {
        return findNewestMatchingToolCall(messages, shouldRequestBrowserUserLocation);
    }, []);

    /**
     * Finds the newest privacy-tool call that asks for private mode confirmation.
     */
    const findPendingPrivacyToolCall = useCallback((messages: ReadonlyArray<ChatMessage>): ToolCall | null => {
        return findNewestMatchingToolCall(messages, shouldRequestPrivateModeEnable);
    }, []);

    /**
     * Finds the newest pseudo-user TEAM tool call that requests one user reply.
     */
    const findPendingPseudoUserToolCall = useCallback((messages: ReadonlyArray<ChatMessage>): ToolCall | null => {
        return findNewestMatchingToolCall(messages, shouldRequestPseudoUserReply);
    }, []);

    /**
     * Finds the newest wallet-related tool call asking for credentials.
     */
    const findPendingWalletToolCall = useCallback((messages: ReadonlyArray<ChatMessage>): ToolCall | null => {
        return findNewestMatchingToolCall(
            messages,
            (toolCall) => shouldRequestWalletRecord(toolCall) || shouldRequestWalletCredential(toolCall),
        );
    }, []);

    const handleMessagesChange = useCallback(
        (messages: ReadonlyArray<ChatMessage>) => {
            onMessagesChange?.(messages);

            const locationToolCall = findPendingLocationToolCall(messages);
            if (locationToolCall) {
                const locationMarker = createToolCallMarker(locationToolCall);
                if (!handledLocationToolCallMarkersRef.current.has(locationMarker)) {
                    handledLocationToolCallMarkersRef.current.add(locationMarker);

                    if (!userLocationPromptParameter?.permission) {
                        void requestBrowserUserLocation();
                    }
                }
            }

            const privacyToolCall = findPendingPrivacyToolCall(messages);
            if (privacyToolCall) {
                const privacyMarker = createToolCallMarker(privacyToolCall);
                if (!handledPrivacyToolCallMarkersRef.current.has(privacyMarker)) {
                    handledPrivacyToolCallMarkersRef.current.add(privacyMarker);
                    void requestPrivateModeEnableConfirmation();
                }
            }

            const pseudoUserToolCall = findPendingPseudoUserToolCall(messages);
            if (!pseudoUserToolCall) {
                const walletToolCall = findPendingWalletToolCall(messages);
                if (!walletToolCall) {
                    return;
                }

                const walletMarker = createToolCallMarker(walletToolCall);
                if (handledWalletToolCallMarkersRef.current.has(walletMarker)) {
                    return;
                }

                handledWalletToolCallMarkersRef.current.add(walletMarker);
                setPendingWalletRequest(buildPendingWalletRequest(walletToolCall));
                return;
            }

            const pseudoUserMarker = createToolCallMarker(pseudoUserToolCall);
            if (handledPseudoUserToolCallMarkersRef.current.has(pseudoUserMarker)) {
                return;
            }
            handledPseudoUserToolCallMarkersRef.current.add(pseudoUserMarker);

            setPendingPseudoUserInteraction({
                marker: pseudoUserMarker,
                prompt: getPseudoUserPromptText(pseudoUserToolCall),
                agentName: agent?.meta.fullname || agent?.agentName || 'Agent',
                teammateLabel: getPseudoUserLabel(pseudoUserToolCall),
            });
        },
        [
            agent?.agentName,
            agent?.meta.fullname,
            findPendingLocationToolCall,
            findPendingPrivacyToolCall,
            findPendingPseudoUserToolCall,
            onMessagesChange,
            requestBrowserUserLocation,
            requestPrivateModeEnableConfirmation,
            userLocationPromptParameter,
            findPendingWalletToolCall,
        ],
    );

    /**
     * Sends one pseudo-user reply back to the main chat and closes the modal.
     */
    const handlePseudoUserReplySubmit = useCallback(
        async (reply: string) => {
            setPendingPseudoUserInteraction(null);
            sendMessage(reply);
        },
        [sendMessage],
    );

    /**
     * Dismisses the pseudo-user reply modal without sending a message.
     */
    const handlePseudoUserReplyClose = useCallback(() => {
        setPendingPseudoUserInteraction(null);
    }, []);

    /**
     * Stores one wallet credential submitted from the popup and asks agent to continue.
     */
    const handleWalletRequestSubmit = useCallback(
        async (payload: WalletRecordDialogSubmitPayload) => {
            const shouldScopeToAgent = !payload.isGlobal && Boolean(currentAgentPermanentId);
            const isGlobal = !shouldScopeToAgent;

            const response = await fetch('/api/user-wallet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recordType: payload.recordType,
                    service: payload.service,
                    key: payload.key,
                    username: payload.username,
                    password: payload.password,
                    secret: payload.secret,
                    cookies: payload.cookies,
                    jsonSchema: payload.jsonSchema,
                    isUserScoped: payload.isUserScoped === true,
                    isGlobal,
                    agentPermanentId: shouldScopeToAgent ? currentAgentPermanentId : null,
                }),
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as { error?: string } | null;
                throw new Error(payload?.error || 'Failed to store wallet record.');
            }

            setPendingWalletRequest(null);
            sendMessage('Wallet credential saved. Continue with the previous task.');
        },
        [currentAgentPermanentId, sendMessage],
    );

    /**
     * Dismisses wallet request popup without saving.
     */
    const handleWalletRequestClose = useCallback(() => {
        setPendingWalletRequest(null);
    }, []);

    const promptParameters = useMemo(() => {
        const parameters: Record<string, unknown> = {
            selfLearningEnabled: effectiveSelfLearningEnabled,
        };

        if (userLocationPromptParameter) {
            parameters[USER_LOCATION_PROMPT_PARAMETER] =
                serializeUserLocationPromptParameter(userLocationPromptParameter);
        }

        return parameters;
    }, [effectiveSelfLearningEnabled, userLocationPromptParameter]);

    if (!agent) {
        return <>{/* <- TODO: [🐱‍🚀] <PromptbookLoading /> */}</>;
    }

    return (
        <>
            <AgentChat
                key={chatKey}
                className={`w-full h-full`}
                style={chatBackgroundStyle}
                agent={agent}
                onFeedback={shouldEnableFeedback ? handleFeedback : undefined}
                onFileUpload={allowFileAttachments ? handleFileUpload : undefined}
                onError={handleError}
                defaultMessage={defaultMessage}
                autoExecuteMessage={effectiveAutoExecuteMessage}
                autoExecuteMessageAttachments={effectiveAutoExecuteMessageAttachments}
                persistenceKey={persistenceKey}
                onChange={handleMessagesChange}
                onInputTextChange={onInputTextChange}
                sendMessage={sendMessage}
                speechRecognition={speechRecognition}
                visual="FULL_PAGE"
                effectConfigs={effectConfigs}
                soundSystem={soundSystem}
                thinkingMessages={thinkingMessages}
                speechRecognitionLanguage={speechRecognitionLanguage}
                isSpeechPlaybackEnabled={isSpeechFeaturesEnabled}
                chatFailMessage={chatFailMessage}
                promptParameters={promptParameters}
                onReset={onStartNewChat}
                resetMode={onStartNewChat ? 'delegate' : undefined}
                teamAgentProfiles={teamAgentProfiles}
            />
            <PseudoUserChatDialog
                isOpen={pendingPseudoUserInteraction !== null}
                prompt={pendingPseudoUserInteraction?.prompt || ''}
                agentName={pendingPseudoUserInteraction?.agentName || 'Agent'}
                userName={pendingPseudoUserInteraction?.teammateLabel || 'User'}
                onSubmit={handlePseudoUserReplySubmit}
                onClose={handlePseudoUserReplyClose}
            />
            <WalletRecordDialog
                isOpen={pendingWalletRequest !== null}
                request={pendingWalletRequest}
                onSubmit={handleWalletRequestSubmit}
                onClose={handleWalletRequestClose}
                githubApp={{
                    isConfigured: githubAppStatus?.isConfigured === true,
                    agentPermanentId: currentAgentPermanentId,
                }}
            />
            <ChatErrorDialog
                error={currentError}
                onRetry={handleRetry}
                onReset={handleReset}
                onDismiss={handleDismissError}
            />
            {shouldRenderMetaDisclaimerDialog && (
                <MetaDisclaimerDialog
                    markdown={metaDisclaimerMarkdown}
                    isAccepting={isMetaDisclaimerAccepting}
                    errorMessage={metaDisclaimerError}
                    onAccept={() => {
                        void handleAcceptMetaDisclaimer();
                    }}
                    onRetry={() => {
                        void loadMetaDisclaimerStatus();
                    }}
                />
            )}
        </>
    );
}

/**
 * TODO: [🚗] Transfer the saving logic to `<BookEditor/>` be aware of CRDT / yjs approach to be implementable in future
 */
