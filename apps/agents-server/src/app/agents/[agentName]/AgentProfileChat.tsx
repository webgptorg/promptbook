'use client';

import { usePromise } from '@common/hooks/usePromise';
import { RemoteAgent } from '@promptbook-local/core';
import { string_book, type ChatMessage } from '@promptbook-local/types';
import { useRouter } from 'next/navigation';
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
import { ThemedChat } from '../../../components/ThemePreferences/ThemedChat';
import type { ServerLanguageCode } from '../../../languages/ServerLanguageRegistry';
import { executeQuickActionButton } from '../../../utils/chat/executeQuickActionButton';
import { resolveChatMessageValidationIssue } from '../../../utils/chat/validateChatMessageContent';
import { createServerLanguageMoment } from '../../../utils/localization/createServerLanguageMoment';
import { createDefaultSpeechRecognition } from '../../../utils/speech-to-text/createDefaultSpeechRecognition';
import { chatFileUploadHandler } from '../../../utils/upload/createBookEditorUploadHandler';
import { createUserChatClientMessageId, type UserChatSummary } from '../../../utils/userChatClient';
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
    const router = useRouter();
    const [isCreatingAgent, setIsCreatingAgent] = useState(false);
    const { formatText } = useAgentNaming();
    const { language, t } = useServerLanguage();
    const { chatVisualMode } = useChatVisualMode();
    const { enterBehavior, resolveEnterBehavior } = useChatEnterBehaviorPreferences();
    const { isPrivateModeEnabled } = usePrivateModePreferences();

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
        navigateToChat,
        resolveExistingChatHref,
        newChatHref,
    } = useAgentProfileChatNavigation({
        chatRoute,
        isHistoryEnabled,
    });

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

            return navigateToChat({
                shouldForceNewChat,
            });
        },
        [agentName, brandColorHex, fullname, inputPlaceholder, navigateToChat],
    );
    const handleCreateAgent = useCallback(
        async (bookContent: string) => {
            setIsCreatingAgent(true);
            try {
                const { permanentId } = await $createAgentFromBookAction(bookContent as string_book);
                if (permanentId) {
                    router.push(`/agents/${permanentId}`);
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
        [formatText, router],
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
                            void navigateToDestination(href);
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
                <div className="absolute inset-0 rounded-[32px] border border-white/30 bg-gradient-to-br from-white/80 via-white/70 to-slate-100/70 shadow-[0_25px_80px_rgba(15,23,42,0.25)]" />
                <div className="relative z-10 h-full w-full rounded-[32px] border border-white/40 bg-white/80 p-4 shadow-2xl backdrop-blur-3xl">
                    {initialMessage === undefined ? (
                        <ChatThreadLoadingSkeleton
                            withComposer
                            className="h-full w-full rounded-[28px] border border-white/40 bg-white/75"
                        />
                    ) : (
                        <ThemedChat
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
                            layout="STANDALONE"
                        />
                    )}
                </div>
            </div>
        </div>
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
        <section className="relative w-full overflow-hidden rounded-[28px] border border-blue-200 bg-gradient-to-br from-blue-50 to-white/80 shadow-2xl shadow-blue-200/30">
            <div
                className="absolute left-4 right-4 top-3 h-1 rounded-full"
                style={{
                    background: `linear-gradient(120deg, ${brandColorHex}, ${brandColorHex}80, transparent)`,
                }}
            />
            <div className="relative z-10 px-5 py-5">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-slate-500">
                        {formatText('My chats')}
                    </p>
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-[0.55rem] font-semibold uppercase tracking-[0.3em] text-blue-600">
                        {formatText('Private')}
                    </span>
                </div>
                <p className="text-sm font-semibold text-slate-900">{formatText('This chat is private')}</p>
                <p className="text-xs text-slate-500">
                    {formatText(
                        'Messages are kept local, and nothing is stored or learned while private mode is active.',
                    )}
                </p>
                <div className="mt-4 rounded-2xl border border-blue-100 bg-white/90 p-3 text-xs font-medium text-slate-600">
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
        <section className="relative w-full overflow-hidden rounded-[28px] border border-white/50 bg-white/80 shadow-2xl shadow-slate-900/20 backdrop-blur-3xl">
            <div
                className="absolute left-4 right-4 top-3 h-1 rounded-full"
                style={{
                    background: `linear-gradient(120deg, ${brandColorHex}, ${brandColorHex}80, transparent)`,
                }}
            />
            <div className="relative z-10 px-5 py-5">
                <div className="flex flex-col gap-1">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-slate-500">
                        {formatText('My chats')}
                    </p>
                    <p className="text-sm font-semibold text-slate-900">{formatText('Pick up where you left off')}</p>
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
                        const titleWithPreview = chat.preview ? `${title} — ${chat.preview}` : title;
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
                                className="flex w-full flex-col gap-2 rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-3 text-left shadow-sm shadow-slate-900/10 transition duration-150 hover:border-slate-400 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/80 min-h-[96px]"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <span
                                            className="h-2 w-2 flex-shrink-0 rounded-full"
                                            style={{ backgroundColor: brandColorHex }}
                                        />
                                        <span className="text-sm font-semibold text-slate-900 line-clamp-1">
                                            {title}
                                        </span>
                                    </div>
                                    <time
                                        dateTime={updatedAtMoment ? updatedAtMoment.toISOString() : chat.updatedAt}
                                        title={fullTimeLabel}
                                        className="text-[0.65rem] font-semibold text-slate-400"
                                    >
                                        {timeLabel}
                                    </time>
                                </div>
                                <p className="text-[0.74rem] font-medium text-slate-500 line-clamp-2">{previewText}</p>
                            </HeadlessLink>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
