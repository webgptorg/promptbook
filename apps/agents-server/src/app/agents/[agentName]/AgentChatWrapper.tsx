'use client';

import { WalletRecordDialog } from '@/src/components/WalletRecordDialog/WalletRecordDialog';
import { usePromise } from '@common/hooks/usePromise';
import { AgentChat, ChatMessage, useSendMessageToLlmChat } from '@promptbook-local/components';
import { RemoteAgent } from '@promptbook-local/core';
import { ClientVersionMismatchError } from '@promptbook-local/utils';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { string_agent_url } from '../../../../../../src/types/typeAliases';
import { useAgentBackground } from '../../../components/AgentProfile/useAgentBackground';
import { ChatErrorDialog } from '../../../components/ChatErrorDialog';
import { usePrivateModePreferences } from '../../../components/PrivateModePreferences/PrivateModePreferencesProvider';
import { useSelfLearningPreferences } from '../../../components/SelfLearningPreferences/SelfLearningPreferencesProvider';
import { ChatThreadLoadingSkeleton } from '../../../components/Skeleton/ChatThreadLoadingSkeleton';
import { useServerLanguage } from '../../../components/ServerLanguage/ServerLanguageProvider';
import { useSoundSystem } from '../../../components/SoundSystemProvider/SoundSystemProvider';
import { resolveAgentChatInputPlaceholder } from '../../../utils/agentChatInputPlaceholder';
import { createDefaultChatEffects } from '../../../utils/chat/createDefaultChatEffects';
import { reportClientVersionMismatch } from '../../../utils/clientVersionClient';
import type { FriendlyErrorMessage } from '../../../utils/errorMessages';
import { handleChatError } from '../../../utils/errorMessages';
import { fetchGithubAppStatus, type GithubAppStatusResponse } from '../../../utils/githubAppClient';
import { createDefaultSpeechRecognition } from '../../../utils/speech-to-text/createDefaultSpeechRecognition';
import { chatFileUploadHandler } from '../../../utils/upload/createBookEditorUploadHandler';
import { serializeUserLocationPromptParameter, USER_LOCATION_PROMPT_PARAMETER } from '../../../utils/userLocationPromptParameter';
import { MetaDisclaimerDialog } from './MetaDisclaimerDialog';
import { PseudoUserChatDialog } from './PseudoUserChatDialog';
import { useAgentChatMetaDisclaimer } from './useAgentChatMetaDisclaimer';
import { useAgentChatToolInteractions } from './useAgentChatToolInteractions';
import { useTeamAgentProfiles } from './useTeamAgentProfiles';

/**
 * Props accepted by `<AgentChatWrapper/>`.
 */
type AgentChatWrapperProps = {
    agentName: string;
    agentUrl: string_agent_url;
    inputPlaceholder?: string;
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

// TODO: [🐱‍🚀] Rename to AgentChatSomethingWrapper

/**
 * Renders the full-page agent chat and coordinates chat-specific side effects.
 */
export function AgentChatWrapper(props: AgentChatWrapperProps) {
    const {
        agentName,
        agentUrl,
        inputPlaceholder,
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
    const effectiveInputPlaceholder = resolveAgentChatInputPlaceholder(inputPlaceholder);

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
    const sendMessage = useSendMessageToLlmChat();
    const [githubAppStatus, setGithubAppStatus] = useState<GithubAppStatusResponse | null>(null);
    const currentAgentPermanentId = useMemo(() => {
        return typeof (agent as { permanentId?: unknown } | undefined)?.permanentId === 'string'
            ? ((agent as { permanentId?: string }).permanentId as string)
            : undefined;
    }, [agent]);

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

        return createDefaultSpeechRecognition();
    }, [isSpeechFeaturesEnabled]);

    const effectConfigs = useMemo(() => createDefaultChatEffects(), []);
    const { soundSystem } = useSoundSystem();
    const { isSelfLearningEnabled } = useSelfLearningPreferences();
    const { isPrivateModeEnabled, setIsPrivateModeEnabled } = usePrivateModePreferences();
    const { t } = useServerLanguage();
    const effectiveSelfLearningEnabled = isSelfLearningEnabled && !isPrivateModeEnabled;

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
        onMessagesChange,
        sendMessage,
        currentAgentPermanentId,
        isPrivateModeEnabled,
        setIsPrivateModeEnabled,
        t,
    });

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
        return (
            <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-white/30 bg-white/70 backdrop-blur-sm">
                <ChatThreadLoadingSkeleton />
            </div>
        );
    }

    return (
        <>
            <AgentChat
                key={chatKey}
                className={`h-full min-h-0 w-full`}
                style={chatBackgroundStyle}
                agent={agent}
                placeholderMessageContent={effectiveInputPlaceholder}
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
