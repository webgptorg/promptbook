'use client';

import { usePromise } from '@common/hooks/usePromise';
import { Chat } from '@promptbook-local/components';
import { RemoteAgent } from '@promptbook-local/core';
import { string_book, type ChatMessage } from '@promptbook-local/types';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { spaceTrim } from 'spacetrim';
import { string_agent_url, string_color } from '../../../../../../src/types/typeAliases';
import { $getCurrentDate } from '../../../../../../src/utils/misc/$getCurrentDate';
import { keepUnused } from '../../../../../../src/utils/organization/keepUnused';
import { $createAgentFromBookAction } from '../../../app/actions';
import { useAgentNaming } from '../../../components/AgentNaming/AgentNamingContext';
import { showAlert } from '../../../components/AsyncDialogs/asyncDialogs';
import { useChatEnterBehaviorPreferences } from '../../../components/ChatEnterBehavior/ChatEnterBehaviorPreferencesProvider';
import { useChatVisualMode } from '../../../components/ChatVisualMode/ChatVisualModeProvider';
import { DeletedAgentBanner } from '../../../components/DeletedAgentBanner';
import { createMyChatsMobileMenuItem } from '../../../components/Header/createMyChatsMobileMenuItem';
import { useHoistedMobileMenuItems } from '../../../components/Header/MobileMenuHoistingContext';
import { dispatchNavigationProgressStart } from '../../../components/NavigationProgress/navigationProgressEvents';
import { HeadlessLink } from '../../../components/_utils/headlessParam';
import { usePrivateModePreferences } from '../../../components/PrivateModePreferences/PrivateModePreferencesProvider';
import { useServerLanguage } from '../../../components/ServerLanguage/ServerLanguageProvider';
import type { ServerLanguageCode } from '../../../languages/ServerLanguageRegistry';
import { executeQuickActionButton } from '../../../utils/chat/executeQuickActionButton';
import { resolveChatMessageValidationIssue } from '../../../utils/chat/validateChatMessageContent';
import { createServerLanguageMoment } from '../../../utils/localization/createServerLanguageMoment';
import { createDefaultSpeechRecognition } from '../../../utils/speech-to-text/createDefaultSpeechRecognition';
import { chatFileUploadHandler } from '../../../utils/upload/createBookEditorUploadHandler';
import { fetchUserChats, type UserChatSummary } from '../../../utils/userChatClient';
import { buildAgentChatDestinationUrl, normalizeDestinationForLocationComparison } from './agentChatNavigationUtils';
import { setPendingProfileMessage } from './profileMessageCache';

/**
 * Props for rendering the profile-page chat preview for one agent.
 */
export type AgentProfileChatProps = {
    agentUrl: string_agent_url;
    agentName: string;
    fullname: string;
    inputPlaceholder: string;
    brandColorHex: string_color;
    avatarSrc: string;
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
 * Wait duration before falling back to hard navigation when SPA push stalls.
 */
const PROFILE_CHAT_NAVIGATION_FALLBACK_DELAY_MS = 1_200;

/**
 * Maximum time the component will remain in the "navigating" visual state before
 * resetting back to interactive.  This is a safety valve that prevents the profile
 * page from being permanently locked if the SPA navigation and its hard-navigation
 * fallback both fail or are aborted.
 */
const PROFILE_CHAT_NAVIGATION_STATE_RESET_MS = 2_500;

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
function hasMessageContent(message: string | undefined): message is string {
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
    isDeleted = false,
    speechRecognitionLanguage,
    isHistoryEnabled = false,
    areFileAttachmentsEnabled = true,
}: AgentProfileChatProps) {
    const router = useRouter();
    const [isCreatingAgent, setIsCreatingAgent] = useState(false);
    const [isNavigatingToChat, setIsNavigatingToChat] = useState(false);
    const [existingChats, setExistingChats] = useState<Array<UserChatSummary>>([]);
    const pendingNavigationFallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isNavigatingToChatResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { formatText } = useAgentNaming();
    const { language, t } = useServerLanguage();
    const { chatVisualMode } = useChatVisualMode();
    const { enterBehavior, resolveEnterBehavior } = useChatEnterBehaviorPreferences();
    const { isPrivateModeEnabled } = usePrivateModePreferences();
    const allowFileAttachments = areFileAttachmentsEnabled;

    keepUnused(isCreatingAgent);

    const agentPromise = useMemo(
        () =>
            RemoteAgent.connect({
                agentUrl,
                isVerbose: true,
            }),
        [agentUrl],
    );

    const { value: agent } = usePromise(agentPromise, [agentPromise]);
    const chatRoute = useMemo(() => `/agents/${encodeURIComponent(agentName)}/chat`, [agentName]);

    useEffect(() => {
        void router.prefetch(chatRoute) /*.catch(() => undefined)*/;
    }, [chatRoute, router]);

    useEffect(() => {
        if (!isHistoryEnabled || isPrivateModeEnabled) {
            setExistingChats([]);
            return;
        }

        let isActive = true;

        async function loadExistingChats(): Promise<void> {
            try {
                const snapshot = await fetchUserChats(agentName);
                if (!isActive) {
                    return;
                }
                setExistingChats(snapshot.chats);
            } catch (error) {
                console.error('[AgentProfileChat] Failed to load existing chats', error);
            }
        }

        void loadExistingChats();

        return () => {
            isActive = false;
        };
    }, [agentName, isHistoryEnabled, isPrivateModeEnabled]);

    const hasExistingChats = !isPrivateModeEnabled && existingChats.length > 0;

    /**
     * Clears any pending hard-navigation fallback timer.
     */
    const clearPendingNavigationFallback = useCallback(() => {
        if (pendingNavigationFallbackTimeoutRef.current === null) {
            return;
        }

        clearTimeout(pendingNavigationFallbackTimeoutRef.current);
        pendingNavigationFallbackTimeoutRef.current = null;
    }, []);

    useEffect(() => {
        return () => {
            clearPendingNavigationFallback();

            if (isNavigatingToChatResetTimeoutRef.current !== null) {
                clearTimeout(isNavigatingToChatResetTimeoutRef.current);
                isNavigatingToChatResetTimeoutRef.current = null;
            }
        };
    }, [clearPendingNavigationFallback]);

    /**
     * Marks the profile panel as navigating-to-chat, then schedules a safety reset
     * in case the navigation stalls or is aborted.  Without the reset, a failed
     * navigation would leave `isNavigatingToChat = true` and `pointer-events` removed,
     * permanently blocking subsequent interactions.
     */
    const startNavigatingToChat = useCallback(() => {
        setIsNavigatingToChat(true);

        if (isNavigatingToChatResetTimeoutRef.current !== null) {
            clearTimeout(isNavigatingToChatResetTimeoutRef.current);
        }

        isNavigatingToChatResetTimeoutRef.current = setTimeout(() => {
            isNavigatingToChatResetTimeoutRef.current = null;
            console.warn('[AgentProfileChat] Navigation to chat stalled — resetting transitioning state so the page remains interactive');
            setIsNavigatingToChat(false);
        }, PROFILE_CHAT_NAVIGATION_STATE_RESET_MS);
    }, []);

    /**
     * Navigates to one chat destination and marks the profile panel as transitioning.
     */
    const navigateToDestination = useCallback(
        (destination: string) => {
            startNavigatingToChat();
            dispatchNavigationProgressStart({ href: destination, source: 'router' });
            router.push(destination);

            clearPendingNavigationFallback();

            const locationBeforePush = `${window.location.pathname}${window.location.search}${window.location.hash}`;
            const normalizedDestination = normalizeDestinationForLocationComparison(destination);
            pendingNavigationFallbackTimeoutRef.current = setTimeout(() => {
                pendingNavigationFallbackTimeoutRef.current = null;
                const locationAfterPush = `${window.location.pathname}${window.location.search}${window.location.hash}`;
                if (locationAfterPush === locationBeforePush && locationAfterPush !== normalizedDestination) {
                    console.warn('[AgentProfileChat] SPA navigation stalled — falling back to hard navigation', { destination });
                    window.location.assign(destination);
                }
            }, PROFILE_CHAT_NAVIGATION_FALLBACK_DELAY_MS);

            return Promise.resolve();
        },
        [clearPendingNavigationFallback, router, startNavigatingToChat],
    );

    const navigateToChat = useCallback(
        ({ shouldForceNewChat }: { shouldForceNewChat: boolean }) => {
            const destination = buildAgentChatDestinationUrl(chatRoute, { shouldForceNewChat, isHistoryEnabled });
            return navigateToDestination(destination);
        },
        [chatRoute, isHistoryEnabled, navigateToDestination],
    );

    const handleMessage = useCallback(
        (message: string, attachments?: ChatMessage['attachments']) => {
            const validationIssue = resolveChatMessageValidationIssue(message);
            if (validationIssue) {
                throw new Error(validationIssue.message);
            }

            const shouldForceNewChat = hasMessageContent(message) || Boolean(attachments?.length);
            setPendingProfileMessage(agentName, {
                message,
                attachments,
            });
            return navigateToChat({
                shouldForceNewChat,
            });
        },
        [agentName, navigateToChat],
    );
    const resolveExistingChatHref = useCallback(
        (chatId: string) => `${chatRoute}?chat=${encodeURIComponent(chatId)}`,
        [chatRoute],
    );
    const newChatHref = useMemo(
        () => buildAgentChatDestinationUrl(chatRoute, { shouldForceNewChat: true, isHistoryEnabled }),
        [chatRoute, isHistoryEnabled],
    );
    const hoistedMobileMenuItems = useMemo(
        () =>
            !isDeleted && isHistoryEnabled && !isPrivateModeEnabled
                ? [
                      createMyChatsMobileMenuItem({
                          formatText,
                          chats: existingChats,
                          resolveChatHref: resolveExistingChatHref,
                          onSelectChat: () => {
                              startNavigatingToChat();
                          },
                          newChatHref,
                          onCreateChat: () => {
                              startNavigatingToChat();
                          },
                      }),
                  ]
                : [],
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

    const initialMessage = useMemo(() => {
        const fallbackName = formatText('an AI Agent');
        const fallbackInitialMessage = spaceTrim(`
            Hello! I am ${fullname || agentName || fallbackName}.
            
            [Hello](?message=Hello, can you tell me about yourself?)
        `);

        return agent?.initialMessage || fallbackInitialMessage;
    }, [agent, fullname, agentName, formatText]);

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

    // If agent is not loaded yet, we can show a skeleton or just the default Chat structure
    // But to match "same initial message", we need the agent loaded or at least the default fallback.
    // The fallback above matches AgentChat.tsx default.

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
                    <Chat
                        title={`Chat with ${fullname}`}
                        participants={[
                            {
                                name: 'AGENT',
                                fullname,
                                isMe: false,
                                color: brandColorHex,
                                avatarSrc,
                                // <- TODO: [🧠] Maybe this shouldnt be there
                            },
                        ]}
                        chatLocale={language}
                        timingTranslations={{ answerDurationLabel: t('chat.answerDurationLabel') }}
                        feedbackTranslations={{
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
                        }}
                        messages={[
                            {
                                sender: 'AGENT',
                                content: initialMessage,
                                createdAt: $getCurrentDate(),
                                id: 'initial-message',
                                isComplete: true,
                            },
                        ]}
                        onMessage={handleMessage}
                        onActionButton={executeQuickActionButton}
                        onCreateAgent={handleCreateAgent}
                        onFileUpload={allowFileAttachments ? handleFileUpload : undefined}
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
                        CHAT_VISUAL_MODE={chatVisualMode}
                        visual={'STANDALONE'}
                    />
                </div>
            </div>
        </div>
    );
}

/**
 * Props used by the profile quick-access chat panel.
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
