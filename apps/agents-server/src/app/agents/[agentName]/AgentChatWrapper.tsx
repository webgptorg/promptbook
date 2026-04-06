'use client';

import { WalletRecordDialog } from '@/src/components/WalletRecordDialog/WalletRecordDialog';
import { usePromise } from '@common/hooks/usePromise';
import { AgentChat, ChatMessage, useSendMessageToLlmChat } from '@promptbook-local/components';
import { RemoteAgent } from '@promptbook-local/core';
import { ClientVersionMismatchError } from '@promptbook-local/utils';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { string_agent_url } from '../../../../../../src/types/typeAliases';
import { useAgentBackground } from '../../../components/AgentProfile/useAgentBackground';
import { useChatEnterBehaviorPreferences } from '../../../components/ChatEnterBehavior/ChatEnterBehaviorPreferencesProvider';
import { useChatVisualMode } from '../../../components/ChatVisualMode/ChatVisualModeProvider';
import { ChatErrorDialog } from '../../../components/ChatErrorDialog';
import { usePrivateModePreferences } from '../../../components/PrivateModePreferences/PrivateModePreferencesProvider';
import { useSelfLearningPreferences } from '../../../components/SelfLearningPreferences/SelfLearningPreferencesProvider';
import { ChatThreadLoadingSkeleton } from '../../../components/Skeleton/ChatThreadLoadingSkeleton';
import { useServerLanguage } from '../../../components/ServerLanguage/ServerLanguageProvider';
import { useSoundSystem } from '../../../components/SoundSystemProvider/SoundSystemProvider';
import { createDefaultChatEffects } from '../../../utils/chat/createDefaultChatEffects';
import {
    isChatFeedbackEnabled,
    toChatComponentFeedbackMode,
    type ChatFeedbackMode,
} from '../../../utils/chatFeedbackMode';
import { reportClientVersionMismatch } from '../../../utils/clientVersionClient';
import { fetchCalendarOAuthStatus, type CalendarOAuthStatusResponse } from '../../../utils/calendarOAuthClient';
import type { FriendlyErrorMessage } from '../../../utils/errorMessages';
import { handleChatError } from '../../../utils/errorMessages';
import { fetchGithubAppStatus, type GithubAppStatusResponse } from '../../../utils/githubAppClient';
import { executeQuickActionButton } from '../../../utils/chat/executeQuickActionButton';
import { createDefaultSpeechRecognition } from '../../../utils/speech-to-text/createDefaultSpeechRecognition';
import { chatFileUploadHandler } from '../../../utils/upload/createBookEditorUploadHandler';
import { serializeUserLocationPromptParameter, USER_LOCATION_PROMPT_PARAMETER } from '../../../utils/userLocationPromptParameter';
import { MetaDisclaimerDialog } from './MetaDisclaimerDialog';
import { PseudoUserChatDialog } from './PseudoUserChatDialog';
import { useAgentChatMetaDisclaimer } from './useAgentChatMetaDisclaimer';
import { useAgentChatToolInteractions } from './useAgentChatToolInteractions';
import { useTeamAgentProfiles } from './useTeamAgentProfiles';
import type { AgentChatLayoutVariant } from './chat/AgentChatLayoutVariant';

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
     * Controls which feedback UI should be shown after assistant responses.
     */
    feedbackMode?: ChatFeedbackMode;
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
    /**
     * Visual wrapper variant shared with the durable chat route.
     */
    layoutVariant?: AgentChatLayoutVariant;
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
        feedbackMode = 'stars',
        chatFailMessage,
        onStartNewChat,
        onAutoExecuteMessageConsumed,
        layoutVariant = 'default',
    } = props;
    const effectiveInputPlaceholder = inputPlaceholder?.trim() || undefined;
    const isChatGptLikeVariant = layoutVariant === 'chatgptLike';

    const shouldEnableFeedback = isChatFeedbackEnabled(feedbackMode);
    const { backgroundImage, brandColorHex, brandColorLightHex, brandColorDarkHex } = useAgentBackground(brandColor);
    const allowFileAttachments = areFileAttachmentsEnabled ?? true;

    const chatBackgroundStyle: CSSProperties & Record<string, string> = {
        ...(isChatGptLikeVariant
            ? {}
            : {
                  backgroundImage: `url("${backgroundImage}")`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
              }),
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
    const [calendarOAuthStatus, setCalendarOAuthStatus] = useState<CalendarOAuthStatusResponse | null>(null);
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
     * Loads external integration status so wallet popup can offer one-click connect flows.
     */
    useEffect(() => {
        let isMounted = true;

        const loadIntegrationStatus = async () => {
            const [githubStatus, calendarStatus] = await Promise.all([
                fetchGithubAppStatus(),
                fetchCalendarOAuthStatus(currentAgentPermanentId),
            ]);
            if (!isMounted) {
                return;
            }

            setGithubAppStatus(githubStatus);
            setCalendarOAuthStatus(calendarStatus);
        };

        void loadIntegrationStatus();

        return () => {
            isMounted = false;
        };
    }, [currentAgentPermanentId]);

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
    const { chatVisualMode } = useChatVisualMode();
    const { enterBehavior, resolveEnterBehavior } = useChatEnterBehaviorPreferences();
    const { isSelfLearningEnabled } = useSelfLearningPreferences();
    const { isPrivateModeEnabled, setIsPrivateModeEnabled } = usePrivateModePreferences();
    const { t, language } = useServerLanguage();
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
        if (isChatGptLikeVariant) {
            return (
                <div className="agent-chat-panel agent-chat-panel--chatgpt-like flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
                    <div className="agent-chat-panel__inner flex min-h-0 flex-1 overflow-hidden">
                        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/88 shadow-[0_24px_80px_rgba(15,23,42,0.12)] dark:border-slate-800/80 dark:bg-slate-950/88">
                            <ChatThreadLoadingSkeleton />
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-white/30 bg-white/70 backdrop-blur-sm">
                <ChatThreadLoadingSkeleton />
            </div>
        );
    }

    const chatElement = (
        <AgentChat
            key={chatKey}
            className={`agent-chat-panel__chat h-full min-h-0 w-full ${
                isChatGptLikeVariant ? 'agent-chat-panel__chat--chatgpt-like' : ''
            }`}
            style={chatBackgroundStyle}
            agent={agent}
            placeholderMessageContent={effectiveInputPlaceholder}
            chatUiTranslations={{
                inputPlaceholder: t('chat.inputPlaceholder'),
                saveButtonLabel: t('chat.saveButtonLabel'),
                newChatButtonLabel: t('chat.newChatButtonLabel'),
                lifecycleSending: t('chat.lifecycleSending'),
                lifecycleQueued: t('chat.lifecycleQueued'),
                lifecycleRunning: t('chat.lifecycleRunning'),
                lifecycleFailed: t('chat.lifecycleFailed'),
                lifecycleCancelled: t('chat.lifecycleCancelled'),
                lifecycleCompleted: t('chat.lifecycleCompleted'),
                toolCallModalTitle: t('chat.toolCallModalTitle'),
                toolCallModalCloseLabel: t('chat.toolCallModalCloseLabel'),
                toolCallModalCopyLabel: t('chat.toolCallModalCopyLabel'),
                toolCallModalSaveLabel: t('chat.toolCallModalSaveLabel'),
                toolCallModalAdvancedLabel: t('chat.toolCallModalAdvancedLabel'),
                toolCallModalSimpleLabel: t('chat.toolCallModalSimpleLabel'),
                toolCallTimeoutTitle: t('chat.toolCallTimeoutTitle'),
                toolCallTimeoutCancelledTitle: t('chat.toolCallTimeoutCancelledTitle'),
                toolCallTimeoutUpdateTitle: t('chat.toolCallTimeoutUpdateTitle'),
                toolCallTimeoutCancelButton: t('chat.toolCallTimeoutCancelButton'),
                toolCallTimeoutSnoozeButton: t('chat.toolCallTimeoutSnoozeButton'),
                toolCallTimeoutViewAdvancedButton: t('chat.toolCallTimeoutViewAdvancedButton'),
                toolCallTimeoutLoadingMessage: t('chat.toolCallTimeoutLoadingMessage'),
                toolCallTimeoutUnavailableMessage: t('chat.toolCallTimeoutUnavailableMessage'),
                toolCallTimeoutDateLabel: t('chat.toolCallTimeoutDateLabel'),
                toolCallTimeoutMessageLabel: t('chat.toolCallTimeoutMessageLabel'),
                toolCallTimeoutTimezoneLabel: t('chat.toolCallTimeoutTimezoneLabel'),
                toolCallTimeTitle: t('chat.toolCallTimeTitle'),
                toolCallTimeUnknown: t('chat.toolCallTimeUnknown'),
                toolCallTimeTimestampLabel: t('chat.toolCallTimeTimestampLabel'),
            }}
            toolTitles={{
                assistant_preparation: t('chat.toolTitle.assistantPreparation'),
                wallet_credential_used: t('chat.toolTitle.walletCredentialUsed'),
                web_search: t('chat.toolTitle.webSearch'),
                useSearchEngine: t('chat.toolTitle.webSearch'),
                search: t('chat.toolTitle.webSearch'),
                useBrowser: t('chat.toolTitle.websiteScraping'),
                browse: t('chat.toolTitle.websiteScraping'),
                fetch_url_content: t('chat.toolTitle.websiteScraping'),
                run_browser: t('chat.toolTitle.websiteScraping'),
                get_user_location: t('chat.toolTitle.locationProvider'),
                send_email: t('chat.toolTitle.emailSender'),
                useEmail: t('chat.toolTitle.emailSender'),
            }}
            feedbackMode={toChatComponentFeedbackMode(feedbackMode)}
            onFeedback={shouldEnableFeedback ? handleFeedback : undefined}
            onFileUpload={allowFileAttachments ? handleFileUpload : undefined}
            onError={handleError}
            defaultMessage={defaultMessage}
            autoExecuteMessage={effectiveAutoExecuteMessage}
            autoExecuteMessageAttachments={effectiveAutoExecuteMessageAttachments}
            persistenceKey={persistenceKey}
            onChange={handleMessagesChange}
            onInputTextChange={onInputTextChange}
            onActionButton={executeQuickActionButton}
            sendMessage={sendMessage}
            speechRecognition={speechRecognition}
            visual="FULL_PAGE"
            CHAT_VISUAL_MODE={chatVisualMode}
            effectConfigs={effectConfigs}
            soundSystem={soundSystem}
            thinkingMessages={thinkingMessages}
            speechRecognitionLanguage={speechRecognitionLanguage}
            chatLocale={language}
            enterBehavior={enterBehavior}
            resolveEnterBehavior={resolveEnterBehavior}
            isSpeechPlaybackEnabled={isSpeechFeaturesEnabled}
            chatFailMessage={chatFailMessage}
            promptParameters={promptParameters}
            onReset={onStartNewChat}
            resetMode={onStartNewChat ? 'delegate' : undefined}
            teamAgentProfiles={teamAgentProfiles}
            buttonColor={isChatGptLikeVariant ? '#111827' : undefined}
        />
    );

    return (
        <>
            {isChatGptLikeVariant ? (
                <div className="agent-chat-panel agent-chat-panel--chatgpt-like flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
                    <div className="agent-chat-panel__inner flex min-h-0 flex-1 overflow-hidden">{chatElement}</div>
                </div>
            ) : (
                chatElement
            )}
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
                calendarOAuth={{
                    isConfigured: calendarOAuthStatus?.isConfigured === true,
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
