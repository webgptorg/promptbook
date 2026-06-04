'use client';

import { usePromise } from '@common/hooks/usePromise';
import { Chat } from '@promptbook-local/components';
import { RemoteAgent } from '@promptbook-local/core';
import { string_book, type ChatMessage } from '@promptbook-local/types';
import { useCallback, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { spaceTrim } from 'spacetrim';
import { string_agent_url, string_color } from '../../../../../../src/types/typeAliases';
import { $getCurrentDate } from '../../../../../../src/utils/misc/$getCurrentDate';
import { keepUnused } from '../../../../../../src/utils/organization/keepUnused';
import { $createAgentFromBookAction } from '../../../app/actions';
import { HeadlessLink } from '../../../components/_utils/headlessParam';
import { useAgentNaming } from '../../../components/AgentNaming/AgentNamingContext';
import { showAlert } from '../../../components/AsyncDialogs/asyncDialogs';
import { useChatEnterBehaviorPreferences } from '../../../components/ChatEnterBehavior/ChatEnterBehaviorPreferencesProvider';
import { useChatVisualMode } from '../../../components/ChatVisualMode/ChatVisualModeProvider';
import { DeletedAgentBanner } from '../../../components/DeletedAgentBanner';
import { createMyChatsMobileMenuItem } from '../../../components/Header/createMyChatsMobileMenuItem';
import { useHoistedMobileMenuItems } from '../../../components/Header/MobileMenuHoistingContext';
import { usePrivateModePreferences } from '../../../components/PrivateModePreferences/PrivateModePreferencesProvider';
import { useServerLanguage } from '../../../components/ServerLanguage/ServerLanguageProvider';
import { ChatThreadLoadingSkeleton } from '../../../components/Skeleton/ChatThreadLoadingSkeleton';
import { usePromptbookTheme } from '../../../components/ThemeMode/usePromptbookTheme';
import type { ServerLanguageCode } from '../../../languages/ServerLanguageRegistry';
import { buildFreshAgentChatHref } from '../../../utils/agentRouting/agentRouteHrefs';
import { executeQuickActionButton } from '../../../utils/chat/executeQuickActionButton';
import { resolveChatMessageValidationIssue } from '../../../utils/chat/validateChatMessageContent';
import { createServerLanguageMoment } from '../../../utils/localization/createServerLanguageMoment';
import { createDefaultSpeechRecognition } from '../../../utils/speech-to-text/createDefaultSpeechRecognition';
import { chatFileUploadHandler } from '../../../utils/upload/createBookEditorUploadHandler';
import { createUserChatClientMessageId, type UserChatSummary } from '../../../utils/userChatClient';
import { buildAgentChatDestinationUrl } from './agentChatNavigationUtils';
import { AgentChatPageLayout } from './chat/AgentChatPageLayout';
import { setPendingProfileMessage } from './profileMessageCache';
import { useAgentProfileChatExistingChats } from './useAgentProfileChatExistingChats';
import { useAgentProfileChatNavigation } from './useAgentProfileChatNavigation';

/**
 * Props for rendering the profile-page chat preview for one agent.
 *
 * @private internal type of <AgentProfileChat/>
 */
export type AgentProfileChatProps = {
    agentUrl: string_agent_url;
    agentName: string;
    fullname: string;
    inputPlaceholder: string;
    brandColorHex: string_color;
    avatarSrc: string;
    /**
     * Initial message already resolved on the server, when available.
     */
    initialAgentMessage?: string | null;
    isDeleted?: boolean;
    speechRecognitionLanguage?: string;
    isHistoryEnabled?: boolean;
    areFileAttachmentsEnabled?: boolean;
};

/**
 * Number of chat rows visible before scrolling in the profile quick-access panel.
 */
const PROFILE_VISIBLE_CHAT_ROWS = 3;

/**
 * Approximate single-row height used to keep initial list viewport at three visible rows.
 */
const PROFILE_CHAT_ROW_HEIGHT_PX = 96;

/**
 * Vertical gap between chat rows in the profile quick-access list.
 */
const PROFILE_CHAT_ROW_GAP_PX = 12;

/**
 * Inputs used to derive the hoisted mobile-menu items for the profile route.
 *
 * @private internal type of <AgentProfileChat/>
 */
type CreateAgentProfileChatMobileMenuItemsOptions = {
    isDeleted: boolean;
    isHistoryEnabled: boolean;
    isPrivateModeEnabled: boolean;
    formatText: (text: string) => string;
    existingChats: ReadonlyArray<UserChatSummary>;
    resolveExistingChatHref: (chatId: string) => string;
    startNavigatingToChat: () => void;
    newChatHref: string;
};

/**
 * Inputs used to resolve the first rendered agent message in the profile preview.
 *
 * @private internal type of <AgentProfileChat/>
 */
type ResolveAgentProfileChatInitialMessageOptions = {
    initialAgentMessage: string | null | undefined;
    remoteInitialMessage: string | null | undefined;
    fallbackInitialMessage: string;
};

/**
 * Translation callback shape reused by the profile-chat view helpers.
 *
 * @private internal type of <AgentProfileChat/>
 */
type AgentProfileChatTranslate = ReturnType<typeof useServerLanguage>['t'];

/**
 * One immediate profile-to-chat transition snapshot rendered while the standalone
 * chat route is still loading in the background.
 *
 * @private internal type of <AgentProfileChat/>
 */
type OptimisticChatNavigationState = {
    message?: string;
    attachments?: ChatMessage['attachments'];
};

/**
 * Parses one profile-chat timestamp using the active Agents Server language.
 *
 * @param timestamp - ISO string describing the chat update time.
 * @param language - Active Agents Server language code.
 * @returns Localized moment instance or `null` when the timestamp is invalid.
 */
function resolveProfileChatTimestampMoment(
    timestamp: string,
    language: ServerLanguageCode,
): ReturnType<typeof createServerLanguageMoment> | null {
    const parsed = createServerLanguageMoment(timestamp, language);
    return parsed.isValid() ? parsed : null;
}

/**
 * Returns true when a message has non-whitespace content.
 */
function hasMessageContent(message: string | null | undefined): message is string {
    return typeof message === 'string' && spaceTrim(message) !== '';
}

/**
 * Returns true when the browser should preserve default anchor navigation behavior,
 * for example opening a link in a new tab.
 */
function shouldPreserveDefaultLinkNavigation(event: ReactMouseEvent<HTMLAnchorElement>): boolean {
    return event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

/**
 * Creates the hoisted "My chats" mobile-menu entry when the profile route can resume chats.
 */
function createAgentProfileChatMobileMenuItems(
    options: CreateAgentProfileChatMobileMenuItemsOptions,
): Array<ReturnType<typeof createMyChatsMobileMenuItem>> {
    const {
        isDeleted,
        isHistoryEnabled,
        isPrivateModeEnabled,
        formatText,
        existingChats,
        resolveExistingChatHref,
        startNavigatingToChat,
        newChatHref,
    } = options;

    if (isDeleted || !isHistoryEnabled || isPrivateModeEnabled) {
        return [];
    }

    return [
        createMyChatsMobileMenuItem({
            formatText,
            chats: existingChats,
            resolveChatHref: resolveExistingChatHref,
            onSelectChat: startNavigatingToChat,
            newChatHref,
            onCreateChat: startNavigatingToChat,
        }),
    ];
}

/**
 * Resolves the first agent-authored message rendered in the profile preview.
 */
function resolveAgentProfileChatInitialMessage(
    options: ResolveAgentProfileChatInitialMessageOptions,
): string | undefined {
    const { initialAgentMessage, remoteInitialMessage, fallbackInitialMessage } = options;
    const configuredInitialMessage = initialAgentMessage !== undefined ? initialAgentMessage : remoteInitialMessage;

    if (configuredInitialMessage === undefined) {
        return undefined;
    }

    return hasMessageContent(configuredInitialMessage) ? configuredInitialMessage : fallbackInitialMessage;
}

/**
 * Creates the single seeded message displayed in the profile preview chat thread.
 */
function createAgentProfileChatInitialMessages(initialMessage: string | undefined): ReadonlyArray<ChatMessage> {
    if (!hasMessageContent(initialMessage)) {
        return [];
    }

    return [
        {
            sender: 'AGENT',
            content: initialMessage,
            createdAt: $getCurrentDate(),
            id: 'initial-message',
            isComplete: true,
        },
    ];
}

/**
 * Builds the localized feedback translation payload passed into the shared chat component.
 */
function createAgentProfileChatFeedbackTranslations(t: AgentProfileChatTranslate) {
    return {
        reportIssueButtonTitle: t('chat.feedback.reportIssueButtonTitle'),
        reportIssueButtonAriaLabel: t('chat.feedback.reportIssueButtonAriaLabel'),
        reportIssueModalTitle: t('chat.feedback.reportIssueModalTitle'),
        rateResponseModalTitle: t('chat.feedback.rateResponseModalTitle'),
        userQuestionLabel: t('chat.feedback.userQuestionLabel'),
        reportIssueExpectedAnswerLabel: t('chat.feedback.reportIssueExpectedAnswerLabel'),
        expectedAnswerLabel: t('chat.feedback.expectedAnswerLabel'),
        expectedAnswerPlaceholder: t('chat.feedback.expectedAnswerPlaceholder'),
        reportIssueDetailsLabel: t('chat.feedback.reportIssueDetailsLabel'),
        noteLabel: t('chat.feedback.noteLabel'),
        reportIssueDetailsPlaceholder: t('chat.feedback.reportIssueDetailsPlaceholder'),
        notePlaceholder: t('chat.feedback.notePlaceholder'),
        cancelLabel: t('chat.feedback.cancelLabel'),
        reportIssueSubmitLabel: t('chat.feedback.reportIssueSubmitLabel'),
        submitLabel: t('chat.feedback.submitLabel'),
        feedbackSuccessMessage: t('chat.feedback.feedbackSuccessMessage'),
        reportIssueSuccessMessage: t('chat.feedback.reportIssueSuccessMessage'),
        feedbackErrorMessage: t('chat.feedback.feedbackErrorMessage'),
    };
}

/**
 * Returns a small attachment summary for the optimistic navigation bubble.
 *
 * @private internal helper of <AgentProfileChat/>
 */
function createOptimisticAttachmentSummary(
    attachments: ChatMessage['attachments'] | undefined,
    formatText: (text: string) => string,
): string | null {
    const attachmentCount = attachments?.length || 0;
    if (attachmentCount === 0) {
        return null;
    }

    return attachmentCount === 1 ? formatText('1 attachment') : formatText(`${attachmentCount} attachments`);
}

/**
 * Renders the compact chat preview on the agent profile and coordinates the full chat transition.
 *
 * @private Agents Server presentation logic.
 */
export function AgentProfileChat({
    agentUrl,
    agentName,
    fullname,
    inputPlaceholder,
    brandColorHex,
    avatarSrc,
    initialAgentMessage,
    isDeleted = false,
    speechRecognitionLanguage,
    isHistoryEnabled = false,
    areFileAttachmentsEnabled = true,
}: AgentProfileChatProps) {
    const [isCreatingAgent, setIsCreatingAgent] = useState(false);
    const [optimisticNavigationState, setOptimisticNavigationState] = useState<OptimisticChatNavigationState | null>(null);
    const { formatText } = useAgentNaming();
    const { language, t } = useServerLanguage();
    const { chatVisualMode } = useChatVisualMode();
    const { enterBehavior, resolveEnterBehavior } = useChatEnterBehaviorPreferences();
    const { isPrivateModeEnabled } = usePrivateModePreferences();
    const { promptbookTheme } = usePromptbookTheme();

    keepUnused(isCreatingAgent);

    const chatRoute = useMemo(() => `/agents/${encodeURIComponent(agentName)}/chat`, [agentName]);
    const agentPromise = useMemo(
        () =>
            RemoteAgent.connect({
                agentUrl,
                isVerbose: true,
            }),
        [agentUrl],
    );
    const { value: agent } = usePromise(agentPromise, [agentPromise]);
    const { existingChats, hasExistingChats } = useAgentProfileChatExistingChats({
        agentName,
        isHistoryEnabled,
        isPrivateModeEnabled,
    });
    const {
        isNavigatingToChat,
        startNavigatingToChat,
        navigateToDestination,
        resolveExistingChatHref,
        newChatHref,
    } = useAgentProfileChatNavigation({
        chatRoute,
        isHistoryEnabled,
    });

    const navigateToChatDestination = useCallback(
        (destination: string, optimisticState: OptimisticChatNavigationState) => {
            setOptimisticNavigationState(optimisticState);
            return navigateToDestination(destination);
        },
        [navigateToDestination],
    );
    const chatParticipants = useMemo(
        () => [
            {
                name: 'AGENT',
                fullname,
                isMe: false,
                color: brandColorHex,
                avatarSrc,
                // <- TODO: [🧠] Maybe this shouldnt be there
            },
        ],
        [avatarSrc, brandColorHex, fullname],
    );
    const timingTranslations = useMemo(
        () => ({
            answerDurationLabel: t('chat.answerDurationLabel'),
        }),
        [t],
    );
    const feedbackTranslations = useMemo(() => createAgentProfileChatFeedbackTranslations(t), [t]);
    const hoistedMobileMenuItems = useMemo(
        () =>
            createAgentProfileChatMobileMenuItems({
                isDeleted,
                isHistoryEnabled,
                isPrivateModeEnabled,
                formatText,
                existingChats,
                resolveExistingChatHref,
                startNavigatingToChat,
                newChatHref,
            }),
        [
            existingChats,
            formatText,
            isDeleted,
            isHistoryEnabled,
            isPrivateModeEnabled,
            newChatHref,
            resolveExistingChatHref,
            startNavigatingToChat,
        ],
    );

    useHoistedMobileMenuItems(hoistedMobileMenuItems);

    const isSpeechFeaturesEnabled = agent?.isVoiceTtsSttEnabled ?? false;
    const speechRecognition = useMemo(() => {
        if (typeof window === 'undefined' || !isSpeechFeaturesEnabled) {
            return undefined;
        }

        return createDefaultSpeechRecognition();
    }, [isSpeechFeaturesEnabled]);

    const handleMessage = useCallback(
        (message: string, attachments?: ChatMessage['attachments']) => {
            const validationIssue = resolveChatMessageValidationIssue(message);
            if (validationIssue) {
                throw new Error(validationIssue.message);
            }

            const shouldForceNewChat = hasMessageContent(message) || Boolean(attachments?.length);
            const clientMessageId = shouldForceNewChat ? createUserChatClientMessageId() : undefined;
            setPendingProfileMessage(agentName, {
                message,
                attachments,
                clientMessageId,
                agentDisplayName: fullname || agentName,
                brandColorHex,
                inputPlaceholder,
            });

            const destination = buildAgentChatDestinationUrl(chatRoute, {
                shouldForceNewChat,
                isHistoryEnabled,
            });
            return navigateToChatDestination(destination, { message, attachments });
        },
        [agentName, brandColorHex, chatRoute, fullname, inputPlaceholder, isHistoryEnabled, navigateToChatDestination],
    );
    const handleCreateAgent = useCallback(
        async (bookContent: string) => {
            setIsCreatingAgent(true);
            try {
                const { permanentId } = await $createAgentFromBookAction(bookContent as string_book);
                if (permanentId) {
                    window.location.assign(buildFreshAgentChatHref(permanentId));
                }
            } catch (error) {
                console.error('Failed to create agent:', error);
                await showAlert({
                    title: 'Create failed',
                    message: formatText('Failed to create agent. Please try again.'),
                }).catch(() => undefined);
            } finally {
                setIsCreatingAgent(false);
            }
        },
        [formatText],
    );
    const handleFileUpload = useCallback(async (file: File) => chatFileUploadHandler(file), []);
    const fallbackInitialMessage = useMemo(() => {
        const fallbackName = formatText('an AI Agent');
        return spaceTrim(`
            Hello! I am ${fullname || agentName || fallbackName}.
            
            [Hello](?message=Hello, can you tell me about yourself?)
        `);
    }, [fullname, agentName, formatText]);
    const initialMessage = useMemo(
        () =>
            resolveAgentProfileChatInitialMessage({
                initialAgentMessage,
                remoteInitialMessage: agent?.initialMessage,
                fallbackInitialMessage,
            }),
        [agent?.initialMessage, fallbackInitialMessage, initialAgentMessage],
    );
    const initialMessages = useMemo(() => createAgentProfileChatInitialMessages(initialMessage), [initialMessage]);

    // If agent is deleted, show banner instead of chat
    if (isDeleted) {
        return (
            <div className="w-full min-h-[350px] md:min-h-[500px] flex items-center justify-center">
                <DeletedAgentBanner
                    message={formatText('This agent has been deleted. You can restore it from the Recycle Bin.')}
                />
            </div>
        );
    }

    return (
        <>
            {optimisticNavigationState && (
                <AgentProfileChatOptimisticNavigationOverlay
                    fullname={fullname}
                    brandColorHex={brandColorHex}
                    inputPlaceholder={inputPlaceholder}
                    formatText={formatText}
                    chats={existingChats}
                    isHistoryEnabled={isHistoryEnabled && !isPrivateModeEnabled}
                    message={optimisticNavigationState.message}
                    attachments={optimisticNavigationState.attachments}
                />
            )}
            <div className="flex w-full flex-col gap-4">
                {isPrivateModeEnabled ? (
                    <PrivateModeChatPanel formatText={formatText} brandColorHex={brandColorHex} />
                ) : (
                    hasExistingChats && (
                        <ExistingChatsPanel
                            chats={existingChats}
                            formatText={formatText}
                            language={language}
                            resolveChatHref={resolveExistingChatHref}
                            onNavigateToChat={(href) => {
                                void navigateToChatDestination(href, {});
                            }}
                            brandColorHex={brandColorHex}
                        />
                    )
                )}
                <div
                    className={`relative w-full h-[calc(100dvh-300px)] min-h-[350px] md:min-h-[420px] md:h-[500px] agent-chat-route-surface ${
                        isNavigatingToChat ? 'agent-chat-profile-transitioning' : ''
                    }`}
                    aria-busy={isNavigatingToChat || undefined}
                >
                    <div className="absolute inset-0 rounded-[32px] border border-white/30 bg-gradient-to-br from-white/80 via-white/70 to-slate-100/70 shadow-[0_25px_80px_rgba(15,23,42,0.25)] dark:border-slate-700/70 dark:from-slate-950/95 dark:via-slate-900/90 dark:to-sky-950/55 dark:shadow-[0_28px_90px_rgba(2,6,23,0.55)]" />
                    <div className="relative z-10 h-full w-full rounded-[32px] border border-white/40 bg-white/80 p-4 shadow-2xl backdrop-blur-3xl dark:border-slate-700/70 dark:bg-slate-950/78">
                        {initialMessage === undefined ? (
                            <ChatThreadLoadingSkeleton
                                withComposer
                                className="h-full w-full rounded-[28px] border border-white/40 bg-white/75 dark:border-slate-700/60 dark:bg-slate-950/70"
                            />
                        ) : (
                            <Chat
                                title={`Chat with ${fullname}`}
                                participants={chatParticipants}
                                chatLocale={language}
                                timingTranslations={timingTranslations}
                                feedbackTranslations={feedbackTranslations}
                                messages={initialMessages}
                                onMessage={handleMessage}
                                onActionButton={executeQuickActionButton}
                                onCreateAgent={handleCreateAgent}
                                onFileUpload={areFileAttachmentsEnabled ? handleFileUpload : undefined}
                                isSaveButtonEnabled={false}
                                isCopyButtonEnabled={false}
                                className="h-full w-full rounded-[28px] bg-transparent"
                                buttonColor={brandColorHex}
                                style={{ background: 'transparent' }}
                                placeholderMessageContent={inputPlaceholder}
                                speechRecognition={speechRecognition}
                                speechRecognitionLanguage={speechRecognitionLanguage}
                                enterBehavior={enterBehavior}
                                resolveEnterBehavior={resolveEnterBehavior}
                                isSpeechPlaybackEnabled={isSpeechFeaturesEnabled}
                                visualMode={chatVisualMode}
                                theme={promptbookTheme}
                                layout="STANDALONE"
                            />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

/**
 * Props used by the profile quick-access chat panel.
 *
 * @private internal type of <AgentProfileChat/>
 */
type ExistingChatsPanelProps = {
    chats: ReadonlyArray<UserChatSummary>;
    formatText: (text: string) => string;
    language: ServerLanguageCode;
    resolveChatHref: (chatId: string) => string;
    onNavigateToChat: (href: string) => void;
    brandColorHex: string_color;
};

/**
 * Props used by the private-mode informational card shown above the profile chat.
 *
 * @private internal type of <AgentProfileChat/>
 */
type PrivateModeChatPanelProps = {
    formatText: (text: string) => string;
    brandColorHex: string_color;
};

/**
 * Renders the private-mode note in place of the chat history quick-access panel.
 *
 * @private Profile chat helper.
 */
function PrivateModeChatPanel({ formatText, brandColorHex }: PrivateModeChatPanelProps) {
    return (
        <section className="relative w-full overflow-hidden rounded-[28px] border border-blue-200 bg-gradient-to-br from-blue-50 to-white/80 shadow-2xl shadow-blue-200/30 dark:border-blue-500/30 dark:from-slate-950 dark:to-blue-950/55 dark:shadow-slate-950/50">
            <div
                className="absolute left-4 right-4 top-3 h-1 rounded-full"
                style={{
                    background: `linear-gradient(120deg, ${brandColorHex}, ${brandColorHex}80, transparent)`,
                }}
            />
            <div className="relative z-10 px-5 py-5">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
                        {formatText('My chats')}
                    </p>
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-[0.55rem] font-semibold uppercase tracking-[0.3em] text-blue-600 dark:bg-blue-500/15 dark:text-blue-200">
                        {formatText('Private')}
                    </span>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {formatText('This chat is private')}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                    {formatText(
                        'Messages are kept local, and nothing is stored or learned while private mode is active.',
                    )}
                </p>
                <div className="mt-4 rounded-2xl border border-blue-100 bg-white/90 p-3 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300">
                    {formatText(
                        'Use the chat area below to keep the same agent and settings, knowing no history, memories, or learning will be persisted.',
                    )}
                </div>
            </div>
        </section>
    );
}

/**
 * Renders recent chat entries in a stylized card that matches the agent profile aesthetic.
 *
 * @private Profile chat helper.
 */
function ExistingChatsPanel({
    chats,
    formatText,
    language,
    resolveChatHref,
    onNavigateToChat,
    brandColorHex,
}: ExistingChatsPanelProps) {
    const scrollViewportHeight =
        PROFILE_VISIBLE_CHAT_ROWS * PROFILE_CHAT_ROW_HEIGHT_PX +
        (PROFILE_VISIBLE_CHAT_ROWS - 1) * PROFILE_CHAT_ROW_GAP_PX;

    return (
        <section className="relative w-full overflow-hidden rounded-[28px] border border-white/50 bg-white/80 shadow-2xl shadow-slate-900/20 backdrop-blur-3xl dark:border-slate-700/60 dark:bg-slate-950/78 dark:shadow-slate-950/50">
            <div
                className="absolute left-4 right-4 top-3 h-1 rounded-full"
                style={{
                    background: `linear-gradient(120deg, ${brandColorHex}, ${brandColorHex}80, transparent)`,
                }}
            />
            <div className="relative z-10 px-5 py-5">
                <div className="flex flex-col gap-1">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
                        {formatText('My chats')}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {formatText('Pick up where you left off')}
                    </p>
                </div>
                <div className="mt-4 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: `${scrollViewportHeight}px` }}>
                    {chats.map((chat) => {
                        const updatedAtMoment = resolveProfileChatTimestampMoment(chat.updatedAt, language);
                        const fullTimeLabel = updatedAtMoment ? updatedAtMoment.format('L LT') : chat.updatedAt;
                        const timeLabel = updatedAtMoment ? updatedAtMoment.fromNow() || fullTimeLabel : chat.updatedAt;
                        const title = chat.title || formatText('Untitled chat');
                        const previewText = hasMessageContent(chat.preview)
                            ? chat.preview
                            : formatText('No messages yet - start the conversation.');
                        const titleWithPreview = chat.preview ? `${title} - ${chat.preview}` : title;
                        const chatHref = resolveChatHref(chat.id);

                        return (
                            <HeadlessLink
                                key={chat.id}
                                href={chatHref}
                                onClick={(event) => {
                                    if (shouldPreserveDefaultLinkNavigation(event)) {
                                        return;
                                    }
                                    event.preventDefault();
                                    onNavigateToChat(chatHref);
                                }}
                                title={titleWithPreview}
                                className="flex w-full flex-col gap-2 rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-3 text-left shadow-sm shadow-slate-900/10 transition duration-150 hover:border-slate-400 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/80 min-h-[96px] dark:border-slate-700 dark:bg-slate-900/88 dark:shadow-slate-950/35 dark:hover:border-slate-500 dark:hover:bg-slate-900"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <span
                                            className="h-2 w-2 flex-shrink-0 rounded-full"
                                            style={{ backgroundColor: brandColorHex }}
                                        />
                                        <span className="text-sm font-semibold text-slate-900 line-clamp-1 dark:text-slate-100">
                                            {title}
                                        </span>
                                    </div>
                                    <time
                                        dateTime={updatedAtMoment ? updatedAtMoment.toISOString() : chat.updatedAt}
                                        title={fullTimeLabel}
                                        className="text-[0.65rem] font-semibold text-slate-400 dark:text-slate-500"
                                    >
                                        {timeLabel}
                                    </time>
                                </div>
                                <p className="text-[0.74rem] font-medium text-slate-500 line-clamp-2 dark:text-slate-300">
                                    {previewText}
                                </p>
                            </HeadlessLink>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

/**
 * Props rendered by the immediate full-page optimistic chat handoff overlay.
 *
 * @private internal type of <AgentProfileChat/>
 */
type AgentProfileChatOptimisticNavigationOverlayProps = {
    fullname: string;
    brandColorHex: string_color;
    inputPlaceholder: string;
    formatText: (text: string) => string;
    chats: ReadonlyArray<UserChatSummary>;
    isHistoryEnabled: boolean;
    message?: string;
    attachments?: ChatMessage['attachments'];
};

/**
 * Renders a temporary full-page chat shell while the standalone chat route loads.
 *
 * The durable chat history bootstrap still happens on the real `/chat` route. This
 * overlay only makes the route transition feel immediate and keeps the first user
 * message visible until the canonical page takes over.
 *
 * @private Profile chat helper.
 */
function AgentProfileChatOptimisticNavigationOverlay({
    fullname,
    brandColorHex,
    inputPlaceholder,
    formatText,
    chats,
    isHistoryEnabled,
    message,
    attachments,
}: AgentProfileChatOptimisticNavigationOverlayProps) {
    const attachmentSummary = createOptimisticAttachmentSummary(attachments, formatText);

    return (
        <div
            data-testid="optimistic-chat-overlay"
            className="fixed inset-0 z-[90] overflow-hidden bg-slate-50/95 backdrop-blur-sm dark:bg-slate-950/95"
        >
            <AgentChatPageLayout
                sidebar={
                    isHistoryEnabled ? (
                        <aside className="hidden h-full w-80 flex-col border-r border-slate-200/80 bg-white/85 px-4 py-5 backdrop-blur md:flex dark:border-slate-800 dark:bg-slate-950/75">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-slate-400">
                                        {formatText('My chats')}
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        {formatText('Opening chat')}
                                    </p>
                                </div>
                                <span
                                    className="h-2.5 w-2.5 rounded-full shadow-[0_0_0_4px_rgba(59,130,246,0.12)]"
                                    style={{ backgroundColor: brandColorHex }}
                                />
                            </div>
                            <div className="space-y-2 overflow-hidden">
                                <div className="rounded-2xl border border-sky-200/70 bg-sky-50/80 px-4 py-3 text-sm font-semibold text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
                                    {formatText('New chat')}
                                </div>
                                {chats.slice(0, PROFILE_VISIBLE_CHAT_ROWS).map((chat) => (
                                    <div
                                        key={chat.id}
                                        className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70"
                                    >
                                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                                            {chat.title || formatText('Untitled chat')}
                                        </p>
                                        <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                                            {chat.preview || formatText('Waiting for the selected conversation to load.')}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </aside>
                    ) : undefined
                }
            >
                <section className="flex h-full min-h-0 flex-1 flex-col bg-slate-50/80 dark:bg-slate-950/70">
                    <div className="border-b border-slate-200/80 bg-white/80 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-slate-400">
                            {formatText('Chat')}
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                            {formatText(`Chat with ${fullname}`)}
                        </h2>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col justify-end overflow-hidden p-4 md:p-6">
                        <div className="flex-1 overflow-y-auto" />
                        {message ? (
                            <div className="flex justify-end">
                                <div
                                    data-testid="optimistic-chat-overlay-message"
                                    className="max-w-[min(42rem,100%)] rounded-[26px] rounded-br-lg border border-sky-300/70 bg-sky-500 px-5 py-4 text-white shadow-xl shadow-sky-500/25"
                                >
                                    <p className="whitespace-pre-wrap break-words text-sm font-medium md:text-[0.95rem]">
                                        {message}
                                    </p>
                                    {attachmentSummary && (
                                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.25em] text-sky-100">
                                            {attachmentSummary}
                                        </p>
                                    )}
                                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.25em] text-sky-100">
                                        {formatText('Queued')}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-3xl border border-dashed border-slate-300/80 bg-white/70 px-6 py-8 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
                                {formatText('Loading the selected conversation...')}
                            </div>
                        )}
                    </div>
                    <div className="border-t border-slate-200/80 bg-white/80 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
                        <div className="rounded-[28px] border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
                            {inputPlaceholder}
                        </div>
                    </div>
                </section>
            </AgentChatPageLayout>
        </div>
    );
}
