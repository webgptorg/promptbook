'use client';

import { Chat } from '@promptbook-local/components';
import { useCallback, useMemo, type CSSProperties, type ReactNode } from 'react';
import type { ChatParticipant } from '../../../../../../../src/book-components/Chat/types/ChatParticipant';
import { useAgentBackground } from '../../../../components/AgentProfile/useAgentBackground';
import { useChatEnterBehaviorPreferences } from '../../../../components/ChatEnterBehavior/ChatEnterBehaviorPreferencesProvider';
import { useChatVisualMode } from '../../../../components/ChatVisualMode/ChatVisualModeProvider';
import { useServerLanguage } from '../../../../components/ServerLanguage/ServerLanguageProvider';
import { ChatThreadLoadingSkeleton } from '../../../../components/Skeleton/ChatThreadLoadingSkeleton';
import { useSoundSystem } from '../../../../components/SoundSystemProvider/SoundSystemProvider';
import { usePromptbookTheme } from '../../../../components/ThemeMode/usePromptbookTheme';
import { createDefaultChatEffects } from '../../../../utils/chat/createDefaultChatEffects';
import { executeQuickActionButton } from '../../../../utils/chat/executeQuickActionButton';
import {
    isChatFeedbackEnabled,
    toChatComponentFeedbackMode,
    type ChatFeedbackMode,
} from '../../../../utils/chatFeedbackMode';
import { createDefaultSpeechRecognition } from '../../../../utils/speech-to-text/createDefaultSpeechRecognition';
import { chatFileUploadHandler } from '../../../../utils/upload/createBookEditorUploadHandler';
import { getUserChatSourceBannerLabel, type UserChatSource } from '../../../../utils/userChat/UserChatSource';
import type { UserChatJob, UserChatTimeout } from '../../../../utils/userChatClient';
import { ChatTimeoutButton } from './ChatTimeoutButton';
import { isReplyableCanonicalChatMessage } from './chatReplies';
import type { CanonicalAgentChatPanelState } from './useCanonicalAgentChatPanelState';

/**
 * Shared translation helper returned by `createCanonicalAgentChatTranslations`.
 *
 * @private function of CanonicalAgentChatPanel
 */
type CanonicalAgentChatTranslations = {
    readonly chatUiTranslations: Record<string, string>;
    readonly feedbackTranslations: Record<string, string>;
    readonly timingTranslations: {
        answerDurationLabel: string;
    };
    readonly toolTitles: Record<string, string>;
};

/**
 * Translator signature exposed by the server-language provider.
 *
 * @private function of CanonicalAgentChatPanel
 */
type TranslateText = ReturnType<typeof useServerLanguage>['t'];

/**
 * Props consumed by the extracted canonical chat surface.
 *
 * @private function of CanonicalAgentChatPanel
 */
type CanonicalAgentChatSurfaceProps = {
    readonly brandColor?: string;
    readonly inputPlaceholder: string | undefined;
    readonly draftMessage?: string;
    readonly areFileAttachmentsEnabled: boolean;
    readonly feedbackMode: ChatFeedbackMode;
    readonly activeJobs: ReadonlyArray<UserChatJob>;
    readonly activeTimeouts: ReadonlyArray<UserChatTimeout>;
    readonly currentTimestamp: number;
    readonly isReadOnly: boolean;
    readonly readOnlySource?: UserChatSource;
    readonly onDraftMessageChange: (message: string) => void;
    readonly onStartNewChat?: () => Promise<void> | void;
    readonly newChatButtonHref?: string;
    readonly onCancelActiveJob?: (jobId: string) => Promise<void> | void;
    readonly onCancelActiveTimeout?: (timeoutId: string) => Promise<void> | void;
    readonly extraActions?: ReactNode;
    readonly speechRecognitionLanguage?: string;
    readonly state: CanonicalAgentChatPanelState['surface'];
};

/**
 * Accent color used by the synthetic user participant in the chat thread.
 *
 * @private function of CanonicalAgentChatPanel
 */
const USER_PARTICIPANT_COLOR = '#115EB6';

/**
 * Renders the extracted chat-thread shell so `CanonicalAgentChatPanel` stays focused on composition.
 *
 * @private function of CanonicalAgentChatPanel
 */
export function CanonicalAgentChatSurface({
    brandColor,
    inputPlaceholder,
    draftMessage,
    areFileAttachmentsEnabled,
    feedbackMode,
    activeJobs,
    activeTimeouts,
    currentTimestamp,
    isReadOnly,
    readOnlySource,
    onDraftMessageChange,
    onStartNewChat,
    newChatButtonHref,
    onCancelActiveJob,
    onCancelActiveTimeout,
    extraActions,
    speechRecognitionLanguage,
    state,
}: CanonicalAgentChatSurfaceProps) {
    const { backgroundImage, brandColorHex, brandColorLightHex, brandColorDarkHex } = useAgentBackground(brandColor);
    const chatBackgroundStyle = useMemo(
        () =>
            createCanonicalAgentChatBackgroundStyle({
                backgroundImage,
                brandColorDarkHex,
                brandColorHex,
                brandColorLightHex,
            }),
        [backgroundImage, brandColorDarkHex, brandColorHex, brandColorLightHex],
    );
    const participants = useMemo(
        () =>
            createCanonicalAgentChatParticipants({
                agentAvatarDefinition: state.agentAvatarDefinition,
                agentAvatarSrc: state.agentAvatarSrc,
                agentAvatarVisualId: state.agentAvatarVisualId,
                agentDisplayName: state.agentDisplayName,
                brandColorHex,
            }),
        [
            brandColorHex,
            state.agentAvatarDefinition,
            state.agentAvatarSrc,
            state.agentAvatarVisualId,
            state.agentDisplayName,
        ],
    );
    const { language, t: translateText } = useServerLanguage();
    const translations = useMemo(() => createCanonicalAgentChatTranslations(translateText), [translateText]);
    const frozenChatBannerLabel = useMemo(
        () => (readOnlySource ? getUserChatSourceBannerLabel(readOnlySource) : null),
        [readOnlySource],
    );
    const feedbackEnabled = isChatFeedbackEnabled(feedbackMode);
    const cancellableJob = useMemo(() => resolveCancellableJob(activeJobs), [activeJobs]);
    const { chatVisualMode } = useChatVisualMode();
    const { enterBehavior, resolveEnterBehavior } = useChatEnterBehaviorPreferences();
    const { soundSystem } = useSoundSystem();
    const { promptbookTheme } = usePromptbookTheme();
    const effectConfigs = useMemo(() => createDefaultChatEffects(), []);
    const speechRecognition = useMemo(() => {
        if (typeof window === 'undefined' || !state.isSpeechPlaybackEnabled) {
            return undefined;
        }

        return createDefaultSpeechRecognition();
    }, [state.isSpeechPlaybackEnabled]);
    const handleFileUpload = useCallback(async (file: File) => {
        return chatFileUploadHandler(file);
    }, []);
    const cancelAction = useMemo(() => {
        if (isReadOnly || !cancellableJob || !onCancelActiveJob) {
            return null;
        }

        return (
            <button
                type="button"
                className="agent-chat-toolbar-action-button rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] disabled:cursor-default disabled:opacity-50"
                onClick={() => {
                    void onCancelActiveJob(cancellableJob.id);
                }}
                disabled={Boolean(cancellableJob.cancelRequestedAt)}
            >
                {cancellableJob.cancelRequestedAt
                    ? translateText('chat.cancellingJobLabel')
                    : translateText('chat.cancelJobLabel')}
            </button>
        );
    }, [cancellableJob, isReadOnly, onCancelActiveJob, translateText]);
    const extraActionNodes = useMemo(
        () => (
            <>
                {!isReadOnly && (
                    <ChatTimeoutButton
                        activeTimeouts={activeTimeouts}
                        currentTimestamp={currentTimestamp}
                        onCancelActiveTimeout={onCancelActiveTimeout}
                    />
                )}
                {cancelAction}
                {!isReadOnly && extraActions}
            </>
        ),
        [activeTimeouts, cancelAction, currentTimestamp, extraActions, isReadOnly, onCancelActiveTimeout],
    );
    const shouldRenderLoadingSkeleton = state.initialMessage === undefined && state.renderedMessages.length === 0;
    const chatElement = shouldRenderLoadingSkeleton ? (
        renderCanonicalAgentChatLoadingSkeleton()
    ) : (
        <Chat
            className="agent-chat-panel__chat h-full min-h-0 w-full"
            style={chatBackgroundStyle}
            title={`Chat with ${state.agentDisplayName}`}
            messages={state.renderedMessages}
            defaultMessage={draftMessage}
            placeholderMessageContent={inputPlaceholder}
            chatUiTranslations={translations.chatUiTranslations}
            toolTitles={translations.toolTitles}
            onMessage={isReadOnly ? undefined : state.onManualMessage}
            onQuickMessageButton={isReadOnly ? undefined : state.onQuickMessageButton}
            onReplyToMessage={isReadOnly ? undefined : state.onStartReply}
            onCancelReply={isReadOnly ? undefined : state.onCancelReply}
            canReplyToMessage={isReplyableCanonicalChatMessage}
            replyingToMessage={state.replyingToMessage}
            onActionButton={executeQuickActionButton}
            onChange={onDraftMessageChange}
            onReset={isReadOnly ? undefined : onStartNewChat}
            resetRequiresConfirmation={false}
            newChatButtonHref={isReadOnly ? undefined : newChatButtonHref}
            feedbackMode={toChatComponentFeedbackMode(feedbackMode)}
            onFeedback={!isReadOnly && feedbackEnabled ? state.onFeedback : undefined}
            onFileUpload={!isReadOnly && areFileAttachmentsEnabled ? handleFileUpload : undefined}
            participants={participants}
            chatLocale={language}
            timingTranslations={translations.timingTranslations}
            feedbackTranslations={translations.feedbackTranslations}
            buttonColor={brandColorHex}
            layout="FULL_PAGE"
            visualMode={chatVisualMode}
            effectConfigs={effectConfigs}
            soundSystem={soundSystem}
            speechRecognition={speechRecognition}
            speechRecognitionLanguage={speechRecognitionLanguage}
            enterBehavior={enterBehavior}
            resolveEnterBehavior={resolveEnterBehavior}
            isSpeechPlaybackEnabled={state.isSpeechPlaybackEnabled}
            elevenLabsVoiceId={state.elevenLabsVoiceId}
            teamAgentProfiles={state.teamAgentProfiles}
            extraActions={extraActionNodes}
            theme={promptbookTheme}
        >
            {isReadOnly && frozenChatBannerLabel && (
                <div className="mx-4 mt-4 rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-sm font-medium text-amber-900 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                    {translateText('chat.frozenBannerLabel', { source: frozenChatBannerLabel })}
                </div>
            )}
        </Chat>
    );

    return (
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-white/30 bg-white/70 backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-950/70">
            {chatElement}
        </div>
    );
}

/**
 * Builds the CSS custom properties and optional background image for the shared chat shell.
 *
 * @private function of CanonicalAgentChatPanel
 */
function createCanonicalAgentChatBackgroundStyle({
    backgroundImage,
    brandColorHex,
    brandColorLightHex,
    brandColorDarkHex,
}: {
    backgroundImage: string;
    brandColorHex: string;
    brandColorLightHex: string;
    brandColorDarkHex: string;
}): CSSProperties & Record<string, string> {
    return {
        backgroundImage: `url("${backgroundImage}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        '--agent-chat-brand-color': brandColorHex,
        '--agent-chat-brand-color-light': brandColorLightHex,
        '--agent-chat-brand-color-dark': brandColorDarkHex,
    };
}

/**
 * Creates the participant list consumed by the shared chat component.
 *
 * @private function of CanonicalAgentChatPanel
 */
function createCanonicalAgentChatParticipants({
    agentDisplayName,
    agentAvatarDefinition,
    agentAvatarSrc,
    agentAvatarVisualId,
    brandColorHex,
}: {
    agentDisplayName: string;
    agentAvatarDefinition: CanonicalAgentChatPanelState['surface']['agentAvatarDefinition'];
    agentAvatarSrc: CanonicalAgentChatPanelState['surface']['agentAvatarSrc'];
    agentAvatarVisualId: CanonicalAgentChatPanelState['surface']['agentAvatarVisualId'];
    brandColorHex: string;
}): ReadonlyArray<ChatParticipant> {
    return [
        {
            name: 'AGENT',
            fullname: agentDisplayName,
            avatarSrc: agentAvatarSrc || undefined,
            avatarDefinition: agentAvatarDefinition || undefined,
            avatarVisualId: agentAvatarVisualId || undefined,
            color: brandColorHex,
            isMe: false,
        },
        {
            name: 'USER',
            fullname: 'User',
            color: USER_PARTICIPANT_COLOR,
            isMe: true,
        },
    ];
}

/**
 * Returns the job that should power the cancel action, preferring actively running work.
 *
 * @private function of CanonicalAgentChatPanel
 */
function resolveCancellableJob(activeJobs: ReadonlyArray<UserChatJob>): UserChatJob | null {
    return activeJobs.find((job) => job.status === 'RUNNING') || activeJobs[0] || null;
}

/**
 * Renders the loading shell shown before the initial message is resolved.
 *
 * @private function of CanonicalAgentChatPanel
 */
function renderCanonicalAgentChatLoadingSkeleton(): ReactNode {
    return (
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
            <ChatThreadLoadingSkeleton />
        </div>
    );
}

/**
 * Creates the localized translation bundles passed into the shared chat component.
 *
 * @private function of CanonicalAgentChatPanel
 */
function createCanonicalAgentChatTranslations(translateText: TranslateText): CanonicalAgentChatTranslations {
    return {
        chatUiTranslations: {
            inputPlaceholder: translateText('chat.inputPlaceholder'),
            replyingToLabel: translateText('chat.replyingToLabel'),
            replyActionLabel: translateText('chat.replyActionLabel'),
            replyActionTitle: translateText('chat.replyActionTitle'),
            cancelReplyLabel: translateText('chat.cancelReplyLabel'),
            saveButtonLabel: translateText('chat.saveButtonLabel'),
            newChatButtonLabel: translateText('chat.newChatButtonLabel'),
            lifecycleSending: translateText('chat.lifecycleSending'),
            lifecycleQueued: translateText('chat.lifecycleQueued'),
            lifecycleRunning: translateText('chat.lifecycleRunning'),
            lifecycleFailed: translateText('chat.lifecycleFailed'),
            lifecycleCancelled: translateText('chat.lifecycleCancelled'),
            lifecycleCompleted: translateText('chat.lifecycleCompleted'),
            toolCallModalTitle: translateText('chat.toolCallModalTitle'),
            toolCallModalCloseLabel: translateText('chat.toolCallModalCloseLabel'),
            toolCallModalCopyLabel: translateText('chat.toolCallModalCopyLabel'),
            toolCallModalSaveLabel: translateText('chat.toolCallModalSaveLabel'),
            toolCallModalAdvancedLabel: translateText('chat.toolCallModalAdvancedLabel'),
            toolCallModalSimpleLabel: translateText('chat.toolCallModalSimpleLabel'),
            toolCallTimeoutTitle: translateText('chat.toolCallTimeoutTitle'),
            toolCallTimeoutCancelledTitle: translateText('chat.toolCallTimeoutCancelledTitle'),
            toolCallTimeoutUpdateTitle: translateText('chat.toolCallTimeoutUpdateTitle'),
            toolCallTimeoutCancelButton: translateText('chat.toolCallTimeoutCancelButton'),
            toolCallTimeoutSnoozeButton: translateText('chat.toolCallTimeoutSnoozeButton'),
            toolCallTimeoutViewAdvancedButton: translateText('chat.toolCallTimeoutViewAdvancedButton'),
            toolCallTimeoutLoadingMessage: translateText('chat.toolCallTimeoutLoadingMessage'),
            toolCallTimeoutUnavailableMessage: translateText('chat.toolCallTimeoutUnavailableMessage'),
            toolCallTimeoutDateLabel: translateText('chat.toolCallTimeoutDateLabel'),
            toolCallTimeoutMessageLabel: translateText('chat.toolCallTimeoutMessageLabel'),
            toolCallTimeoutTimezoneLabel: translateText('chat.toolCallTimeoutTimezoneLabel'),
            toolCallTimeoutChipLabel: translateText('chat.toolCallTimeoutChipLabel'),
            toolCallTimeoutChipCancelledLabel: translateText('chat.toolCallTimeoutChipCancelledLabel'),
            toolCallTimeoutChipInactiveLabel: translateText('chat.toolCallTimeoutChipInactiveLabel'),
            toolCallTimeoutChipUpdatedLabel: translateText('chat.toolCallTimeoutChipUpdatedLabel'),
            toolCallTimeoutChipFallbackLabel: translateText('chat.toolCallTimeoutChipFallbackLabel'),
            toolCallTimeoutPrimaryScheduledLabel: translateText('chat.toolCallTimeoutPrimaryScheduledLabel'),
            toolCallTimeoutSecondaryDurationLabel: translateText('chat.toolCallTimeoutSecondaryDurationLabel'),
            toolCallTimeoutPrimaryCancelledLabel: translateText('chat.toolCallTimeoutPrimaryCancelledLabel'),
            toolCallTimeoutPrimaryInactiveLabel: translateText('chat.toolCallTimeoutPrimaryInactiveLabel'),
            toolCallTimeoutPrimaryUpdatedLabel: translateText('chat.toolCallTimeoutPrimaryUpdatedLabel'),
            toolCallTimeoutPrimaryFallbackLabel: translateText('chat.toolCallTimeoutPrimaryFallbackLabel'),
            toolCallTimeoutActionGroupLabel: translateText('chat.toolCallTimeoutActionGroupLabel'),
            toolCallTimeoutCancelAriaLabel: translateText('chat.toolCallTimeoutCancelAriaLabel'),
            toolCallTimeoutSnoozeAriaLabel: translateText('chat.toolCallTimeoutSnoozeAriaLabel'),
            toolCallTimeoutViewAdvancedAriaLabel: translateText('chat.toolCallTimeoutViewAdvancedAriaLabel'),
            toolCallTimeTitle: translateText('chat.toolCallTimeTitle'),
            toolCallTimeUnknown: translateText('chat.toolCallTimeUnknown'),
            toolCallTimeTimestampLabel: translateText('chat.toolCallTimeTimestampLabel'),
            toolCallTimeChipLabel: translateText('chat.toolCallTimeChipLabel'),
            toolCallTimeRelativeLabel: translateText('chat.toolCallTimeRelativeLabel'),
        },
        toolTitles: {
            assistant_preparation: translateText('chat.toolTitle.assistantPreparation'),
            wallet_credential_used: translateText('chat.toolTitle.walletCredentialUsed'),
            'self-learning': translateText('chat.toolTitle.selfLearning'),
            retrieve_user_memory: translateText('chat.toolTitle.memoryReader'),
            store_user_memory: translateText('chat.toolTitle.memoryWriter'),
            retrieve_wallet_records: translateText('chat.toolTitle.walletReader'),
            store_wallet_record: translateText('chat.toolTitle.walletWriter'),
            update_wallet_record: translateText('chat.toolTitle.walletUpdater'),
            delete_wallet_record: translateText('chat.toolTitle.walletDeleter'),
            request_wallet_record: translateText('chat.toolTitle.walletRequester'),
            web_search: translateText('chat.toolTitle.webSearch'),
            deep_search: translateText('chat.toolTitle.webSearch'),
            useSearchEngine: translateText('chat.toolTitle.webSearch'),
            search: translateText('chat.toolTitle.webSearch'),
            useBrowser: translateText('chat.toolTitle.websiteScraping'),
            browse: translateText('chat.toolTitle.websiteScraping'),
            fetch_url_content: translateText('chat.toolTitle.websiteScraping'),
            run_browser: translateText('chat.toolTitle.websiteScraping'),
            get_current_time: translateText('chat.toolTitle.timeChecker'),
            useTime: translateText('chat.toolTitle.timeChecker'),
            set_timeout: translateText('chat.toolTitle.timeoutSetter'),
            cancel_timeout: translateText('chat.toolTitle.timeoutCanceller'),
            list_timeouts: translateText('chat.toolTitle.timeoutLister'),
            update_timeout: translateText('chat.toolTitle.timeoutUpdater'),
            get_user_location: translateText('chat.toolTitle.locationProvider'),
            send_email: translateText('chat.toolTitle.emailSender'),
            useEmail: translateText('chat.toolTitle.emailSender'),
            spawn_agent: translateText('chat.toolTitle.agentSpawner'),
            project_list_files: translateText('chat.toolTitle.projectFileLister'),
            project_read_file: translateText('chat.toolTitle.projectFileReader'),
            project_upsert_file: translateText('chat.toolTitle.projectFileWriter'),
            project_delete_file: translateText('chat.toolTitle.projectFileDeleter'),
            project_create_branch: translateText('chat.toolTitle.projectBranchCreator'),
            project_create_pull_request: translateText('chat.toolTitle.projectPullRequestCreator'),
        },
        timingTranslations: {
            answerDurationLabel: translateText('chat.answerDurationLabel'),
        },
        feedbackTranslations: {
            reportIssueButtonTitle: translateText('chat.feedback.reportIssueButtonTitle'),
            reportIssueButtonAriaLabel: translateText('chat.feedback.reportIssueButtonAriaLabel'),
            reportIssueModalTitle: translateText('chat.feedback.reportIssueModalTitle'),
            rateResponseModalTitle: translateText('chat.feedback.rateResponseModalTitle'),
            userQuestionLabel: translateText('chat.feedback.userQuestionLabel'),
            reportIssueExpectedAnswerLabel: translateText('chat.feedback.reportIssueExpectedAnswerLabel'),
            expectedAnswerLabel: translateText('chat.feedback.expectedAnswerLabel'),
            expectedAnswerPlaceholder: translateText('chat.feedback.expectedAnswerPlaceholder'),
            reportIssueDetailsLabel: translateText('chat.feedback.reportIssueDetailsLabel'),
            noteLabel: translateText('chat.feedback.noteLabel'),
            reportIssueDetailsPlaceholder: translateText('chat.feedback.reportIssueDetailsPlaceholder'),
            notePlaceholder: translateText('chat.feedback.notePlaceholder'),
            cancelLabel: translateText('chat.feedback.cancelLabel'),
            reportIssueSubmitLabel: translateText('chat.feedback.reportIssueSubmitLabel'),
            submitLabel: translateText('chat.feedback.submitLabel'),
            feedbackSuccessMessage: translateText('chat.feedback.feedbackSuccessMessage'),
            reportIssueSuccessMessage: translateText('chat.feedback.reportIssueSuccessMessage'),
            feedbackErrorMessage: translateText('chat.feedback.feedbackErrorMessage'),
        },
    };
}
