'use client';

import { WalletRecordDialog } from '@/src/components/WalletRecordDialog/WalletRecordDialog';
import { usePromise } from '@common/hooks/usePromise';
import { Chat } from '@promptbook-local/components';
import type { ChatMessage } from '@promptbook-local/types';
import { RemoteAgent } from '@promptbook-local/core';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import spaceTrim from 'spacetrim';
import { useAgentBackground } from '../../../../components/AgentProfile/useAgentBackground';
import { usePrivateModePreferences } from '../../../../components/PrivateModePreferences/PrivateModePreferencesProvider';
import { useSelfLearningPreferences } from '../../../../components/SelfLearningPreferences/SelfLearningPreferencesProvider';
import { useServerLanguage } from '../../../../components/ServerLanguage/ServerLanguageProvider';
import { useSoundSystem } from '../../../../components/SoundSystemProvider/SoundSystemProvider';
import { createDefaultChatEffects } from '../../../../utils/chat/createDefaultChatEffects';
import { fetchGithubAppStatus, type GithubAppStatusResponse } from '../../../../utils/githubAppClient';
import { createDefaultSpeechRecognition } from '../../../../utils/speech-to-text/createDefaultSpeechRecognition';
import { chatFileUploadHandler } from '../../../../utils/upload/createBookEditorUploadHandler';
import { serializeUserLocationPromptParameter, USER_LOCATION_PROMPT_PARAMETER } from '../../../../utils/userLocationPromptParameter';
import { MetaDisclaimerDialog } from '../MetaDisclaimerDialog';
import { PseudoUserChatDialog } from '../PseudoUserChatDialog';
import { useAgentChatMetaDisclaimer } from '../useAgentChatMetaDisclaimer';
import { useAgentChatToolInteractions } from '../useAgentChatToolInteractions';
import { useTeamAgentProfiles } from '../useTeamAgentProfiles';
import type { UserChatJob, UserChatTimeout } from '../../../../utils/userChatClient';
import { ChatTimeoutButton } from './ChatTimeoutButton';

/**
 * Props accepted by the canonical server-backed chat panel.
 */
type CanonicalAgentChatPanelProps = {
    agentName: string;
    agentUrl: string;
    brandColor?: string;
    inputPlaceholder: string;
    thinkingMessages?: ReadonlyArray<string>;
    speechRecognitionLanguage?: string;
    initialAgentMessage?: string | null;
    messages: ReadonlyArray<ChatMessage>;
    draftMessage?: string;
    autoExecuteMessage?: string;
    autoExecuteMessageAttachments?: ChatMessage['attachments'];
    areFileAttachmentsEnabled: boolean;
    isFeedbackEnabled: boolean;
    activeJobs: ReadonlyArray<UserChatJob>;
    activeTimeouts: ReadonlyArray<UserChatTimeout>;
    currentTimestamp: number;
    onDraftMessageChange: (message: string) => void;
    onSubmitUserTurn: (payload: {
        message: string;
        attachments?: ChatMessage['attachments'];
        parameters?: Record<string, unknown>;
    }) => Promise<void>;
    onStartNewChat?: () => Promise<void> | void;
    onCancelActiveJob?: (jobId: string) => Promise<void> | void;
    onCancelActiveTimeout?: (timeoutId: string) => Promise<void> | void;
    onAutoExecuteMessageConsumed?: () => void;
    extraActions?: ReactNode;
};

/**
 * Serialized auto-execute payload marker used to deduplicate dispatches.
 */
function serializeAutoExecutePayload(message?: string, attachments?: ChatMessage['attachments']): string {
    const normalizedMessage = message ?? '';
    const normalizedAttachments = attachments && attachments.length > 0 ? JSON.stringify(attachments) : '';
    return `${normalizedMessage}|${normalizedAttachments}`;
}

/**
 * Returns true when the UI should show a transient thinking message instead of an empty assistant placeholder.
 */
function shouldShowThinkingMessage(message: ChatMessage): boolean {
    return (
        message.sender !== 'USER' &&
        message.isComplete === false &&
        (message.lifecycleState === 'queued' || message.lifecycleState === 'running') &&
        message.content.trim().length === 0
    );
}

/**
 * Resolves one deterministic thinking-message variant for a message id so multiple viewers of the same chat stay aligned.
 */
function resolveThinkingMessageVariant(messageId: string | number, thinkingMessages: ReadonlyArray<string>): string {
    if (thinkingMessages.length === 0) {
        return 'Thinking...';
    }

    let hash = 0;
    for (const character of String(messageId)) {
        hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    }

    return thinkingMessages[hash % thinkingMessages.length] || thinkingMessages[0] || 'Thinking...';
}

/**
 * Renders the full canonical chat surface while delegating message execution to the server.
 */
export function CanonicalAgentChatPanel(props: CanonicalAgentChatPanelProps) {
    const {
        agentName,
        agentUrl,
        brandColor,
        inputPlaceholder,
        thinkingMessages,
        speechRecognitionLanguage,
        initialAgentMessage,
        messages,
        draftMessage,
        autoExecuteMessage,
        autoExecuteMessageAttachments,
        areFileAttachmentsEnabled,
        isFeedbackEnabled,
        activeJobs,
        activeTimeouts,
        currentTimestamp,
        onDraftMessageChange,
        onSubmitUserTurn,
        onStartNewChat,
        onCancelActiveJob,
        onCancelActiveTimeout,
        onAutoExecuteMessageConsumed,
        extraActions,
    } = props;
    const { backgroundImage, brandColorHex, brandColorLightHex, brandColorDarkHex } = useAgentBackground(brandColor);
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
    const { soundSystem } = useSoundSystem();
    const { isSelfLearningEnabled } = useSelfLearningPreferences();
    const { isPrivateModeEnabled, setIsPrivateModeEnabled } = usePrivateModePreferences();
    const { t } = useServerLanguage();
    const [githubAppStatus, setGithubAppStatus] = useState<GithubAppStatusResponse | null>(null);
    const effectiveSelfLearningEnabled = isSelfLearningEnabled && !isPrivateModeEnabled;
    const currentAgentPermanentId = useMemo(() => {
        return typeof (agent as { permanentId?: unknown } | undefined)?.permanentId === 'string'
            ? ((agent as { permanentId?: string }).permanentId as string)
            : agentName;
    }, [agent, agentName]);
    const effectConfigs = useMemo(() => createDefaultChatEffects(), []);
    const normalizedThinkingMessages = useMemo(() => {
        const normalized = (thinkingMessages || []).map((message) => message.trim()).filter(Boolean);
        return normalized.length > 0 ? normalized : ['Thinking...'];
    }, [thinkingMessages]);
    const speechRecognition = useMemo(() => {
        if (typeof window === 'undefined' || !(agent?.isVoiceTtsSttEnabled ?? false)) {
            return undefined;
        }

        return createDefaultSpeechRecognition();
    }, [agent?.isVoiceTtsSttEnabled]);
    const hasAutoExecutedRef = useRef(false);
    const lastAutoExecutePayloadRef = useRef<string | undefined>(
        serializeAutoExecutePayload(autoExecuteMessage, autoExecuteMessageAttachments),
    );

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

    const promptParameters = useMemo(() => {
        const parameters: Record<string, unknown> = {
            selfLearningEnabled: effectiveSelfLearningEnabled,
        };

        return parameters;
    }, [effectiveSelfLearningEnabled]);

    const sendPromptbookMessage = useCallback(
        (message: string) => {
            void onSubmitUserTurn({
                message,
                parameters: promptParameters,
            });
        },
        [onSubmitUserTurn, promptParameters],
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
        t,
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

    const handleManualMessage = useCallback(
        async (message: string, attachments?: ChatMessage['attachments']) => {
            await onSubmitUserTurn({
                message,
                attachments,
                parameters: effectivePromptParameters,
            });
        },
        [effectivePromptParameters, onSubmitUserTurn],
    );

    useEffect(() => {
        handleMessagesChange(messages);
    }, [handleMessagesChange, messages]);

    useEffect(() => {
        const payload = serializeAutoExecutePayload(autoExecuteMessage, autoExecuteMessageAttachments);
        if (lastAutoExecutePayloadRef.current === payload) {
            return;
        }

        lastAutoExecutePayloadRef.current = payload;
        hasAutoExecutedRef.current = false;
    }, [autoExecuteMessage, autoExecuteMessageAttachments]);

    useEffect(() => {
        const shouldAutoExecute =
            (Boolean(effectiveAutoExecuteMessage) || Boolean(effectiveAutoExecuteMessageAttachments?.length)) &&
            !hasAutoExecutedRef.current;
        if (!shouldAutoExecute) {
            return;
        }

        hasAutoExecutedRef.current = true;
        void handleManualMessage(effectiveAutoExecuteMessage ?? '', effectiveAutoExecuteMessageAttachments);
    }, [effectiveAutoExecuteMessage, effectiveAutoExecuteMessageAttachments, handleManualMessage]);

    const initialMessage = useMemo(() => {
        const agentDisplayName = agent?.meta.fullname || agent?.agentName || agentName;
        return (
            initialAgentMessage ||
            agent?.initialMessage ||
            spaceTrim(`
                Hello! I am ${agentDisplayName}.

                [Hello](?message=Hello, can you tell me about yourself?)
            `)
        );
    }, [agent, agentName, initialAgentMessage]);

    const renderedMessages = useMemo<ReadonlyArray<ChatMessage>>(
        () => [
            {
                id: 'canonical-agent-initial-message',
                sender: 'AGENT',
                content: initialMessage,
                createdAt: messages[0]?.createdAt,
                isComplete: true,
            },
            ...messages.map((message) => {
                if (!shouldShowThinkingMessage(message)) {
                    return message;
                }

                return {
                    ...message,
                    content: resolveThinkingMessageVariant(message.id || 'thinking-message', normalizedThinkingMessages),
                };
            }),
        ],
        [initialMessage, messages, normalizedThinkingMessages],
    );

    const participants = useMemo(
        () => [
            {
                name: 'AGENT',
                fullname: agent?.meta.fullname || agent?.agentName || agentName,
                avatarSrc: agent?.meta.image || `${agentUrl}/images/default-avatar.png`,
                color: brandColorHex,
                isMe: false,
            },
            {
                name: 'USER',
                fullname: 'User',
                color: '#115EB6',
                isMe: true,
            },
        ],
        [agent, agentName, agentUrl, brandColorHex],
    );

    const cancellableJob = useMemo(
        () => activeJobs.find((job) => job.status === 'RUNNING') || activeJobs[0] || null,
        [activeJobs],
    );
    const cancelAction = cancellableJob && onCancelActiveJob && (
        <button
            type="button"
            className="rounded-full border border-slate-300/80 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-default disabled:opacity-50"
            onClick={() => {
                void onCancelActiveJob(cancellableJob.id);
            }}
            disabled={Boolean(cancellableJob.cancelRequestedAt)}
        >
            {cancellableJob.cancelRequestedAt ? 'Cancelling' : 'Cancel'}
        </button>
    );

    const handleFileUpload = useCallback(async (file: File) => {
        return chatFileUploadHandler(file);
    }, []);

    return (
        <>
            <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-white/30 bg-white/70 backdrop-blur-sm">
                <Chat
                    className="h-full min-h-0 w-full"
                    style={chatBackgroundStyle}
                    title={`Chat with ${agent?.meta.fullname || agent?.agentName || agentName}`}
                    messages={renderedMessages}
                    defaultMessage={draftMessage}
                    placeholderMessageContent={inputPlaceholder}
                    onMessage={handleManualMessage as unknown as (message: string) => Promise<void>}
                    onChange={onDraftMessageChange}
                    onReset={onStartNewChat}
                    resetRequiresConfirmation={false}
                    onFeedback={isFeedbackEnabled ? handleFeedback : undefined}
                    onFileUpload={areFileAttachmentsEnabled ? handleFileUpload : undefined}
                    participants={participants}
                    buttonColor={brandColorHex}
                    visual="FULL_PAGE"
                    effectConfigs={effectConfigs}
                    soundSystem={soundSystem}
                    speechRecognition={speechRecognition}
                    speechRecognitionLanguage={speechRecognitionLanguage}
                    isSpeechPlaybackEnabled={agent?.isVoiceTtsSttEnabled ?? false}
                    elevenLabsVoiceId={agent?.meta.voice}
                    teamAgentProfiles={teamAgentProfiles}
                    extraActions={
                        <>
                            <ChatTimeoutButton
                                activeTimeouts={activeTimeouts}
                                currentTimestamp={currentTimestamp}
                                onCancelActiveTimeout={onCancelActiveTimeout}
                            />
                            {cancelAction}
                            {extraActions}
                        </>
                    }
                />
            </div>

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
