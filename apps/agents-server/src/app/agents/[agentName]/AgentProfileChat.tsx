'use client';

import { usePromise } from '@common/hooks/usePromise';
import { Chat } from '@promptbook-local/components';
import { RemoteAgent } from '@promptbook-local/core';
import { string_book } from '@promptbook-local/types';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import spaceTrim from 'spacetrim';
import { OpenAiSpeechRecognition } from '../../../../../../src/speech-recognition/OpenAiSpeechRecognition';
import { string_agent_url, string_color } from '../../../../../../src/types/typeAliases';
import { $getCurrentDate } from '../../../../../../src/utils/misc/$getCurrentDate';
import { keepUnused } from '../../../../../../src/utils/organization/keepUnused';
import { fetchUserChats, type UserChatSummary } from '../../../utils/userChatClient';
import { $createAgentFromBookAction } from '../../../app/actions';
import { useAgentNaming } from '../../../components/AgentNaming/AgentNamingContext';
import { showAlert } from '../../../components/AsyncDialogs/asyncDialogs';
import { DeletedAgentBanner } from '../../../components/DeletedAgentBanner';

/**
 * Props for rendering the profile-page chat preview for one agent.
 */
type AgentProfileChatProps = {
    agentUrl: string_agent_url;
    agentName: string;
    fullname: string;
    brandColorHex: string_color;
    avatarSrc: string;
    isDeleted?: boolean;
    speechRecognitionLanguage?: string;
    isHistoryEnabled?: boolean;
};

/**
 * Browser `Document` extension that exposes the optional View Transition API.
 */
type DocumentWithViewTransition = Document & {
    startViewTransition?: (updateCallback: () => void) => void;
};

/**
 * Query flag used to force creating a fresh history chat on full chat page entry.
 */
const FORCE_NEW_CHAT_QUERY_PARAM = 'newChat';

/**
 * Maximum number of existing chats surfaced as quick buttons on the profile view.
 */
const MAX_PROFILE_EXISTING_CHATS = 3;

/**
 * Describes a relative time unit used when expressing chat timestamps.
 */
type RelativeTimeSegment = {
    /**
     * Threshold in seconds at which this unit becomes appropriate.
     */
    readonly seconds: number;
    /**
     * Relative time format unit consumed by `Intl.RelativeTimeFormat`.
     */
    readonly unit: Intl.RelativeTimeFormatUnit;
};

/**
 * Shared formatter for rendering relative timestamps inside the My chats preview.
 */
const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat(undefined, {
    numeric: 'auto',
    style: 'short',
});

/**
 * Ordered list of relative time segments used to build friendly labels.
 */
const RELATIVE_TIME_SEGMENTS: ReadonlyArray<RelativeTimeSegment> = [
    { seconds: 60 * 60 * 24 * 365, unit: 'year' },
    { seconds: 60 * 60 * 24 * 30, unit: 'month' },
    { seconds: 60 * 60 * 24, unit: 'day' },
    { seconds: 60 * 60, unit: 'hour' },
    { seconds: 60, unit: 'minute' },
    { seconds: 1, unit: 'second' },
];

/**
 * Builds a short relative label (\"2h ago\") for the supplied timestamp.
 *
 * @param timestamp - ISO string describing the last chat update.
 * @returns Human-friendly label or empty string when the timestamp is invalid.
 */
function formatRelativeTimeLabel(timestamp: string): string {
    const date = new Date(timestamp);
    const diffInSeconds = Math.round((date.getTime() - Date.now()) / 1000);
    if (!Number.isFinite(diffInSeconds)) {
        return '';
    }

    for (const segment of RELATIVE_TIME_SEGMENTS) {
        if (Math.abs(diffInSeconds) >= segment.seconds || segment.seconds === 1) {
            const value = Math.round(diffInSeconds / segment.seconds);
            return RELATIVE_TIME_FORMATTER.format(value, segment.unit);
        }
    }

    return '';
}

/**
 * Returns true when a message has non-whitespace content.
 */
function hasMessageContent(message: string | undefined): message is string {
    return typeof message === 'string' && spaceTrim(message) !== '';
}

/**
 * Executes route updates inside a browser view transition when supported.
 */
function runRouteTransition(updateCallback: () => void): void {
    if (typeof document === 'undefined') {
        updateCallback();
        return;
    }

    const documentWithViewTransition = document as DocumentWithViewTransition;
    if (!documentWithViewTransition.startViewTransition) {
        updateCallback();
        return;
    }

    documentWithViewTransition.startViewTransition(updateCallback);
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
    brandColorHex,
    avatarSrc,
    isDeleted = false,
    speechRecognitionLanguage,
    isHistoryEnabled = false,
}: AgentProfileChatProps) {
    const router = useRouter();
    const [isCreatingAgent, setIsCreatingAgent] = useState(false);
    const [isNavigatingToChat, setIsNavigatingToChat] = useState(false);
    const [existingChats, setExistingChats] = useState<Array<UserChatSummary>>([]);
    const { formatText } = useAgentNaming();

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
        if (!isHistoryEnabled) {
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
    }, [agentName, isHistoryEnabled]);

    const visibleExistingChats = useMemo(
        () => existingChats.slice(0, MAX_PROFILE_EXISTING_CHATS),
        [existingChats],
    );
    const hasVisibleExistingChats = visibleExistingChats.length > 0;

    /**
     * Navigates to the provided destination while coordinating the view transition state.
     */
    const navigateToDestination = useCallback(
        (destination: string) => {
            setIsNavigatingToChat(true);

            return new Promise<void>((resolve) => {
                requestAnimationFrame(() => {
                    runRouteTransition(() => {
                        router.push(destination);
                        resolve();
                    });
                });
            });
        },
        [router],
    );

    const navigateToChat = useCallback(
        ({ message }: { message?: string }) => {
            const queryParams = new URLSearchParams();
            if (hasMessageContent(message)) {
                queryParams.set('message', message);
                if (isHistoryEnabled) {
                    queryParams.set(FORCE_NEW_CHAT_QUERY_PARAM, '1');
                }
            }
            const query = queryParams.toString();
            const destination = query ? `${chatRoute}?${query}` : chatRoute;

            return navigateToDestination(destination);
        },
        [chatRoute, isHistoryEnabled, navigateToDestination],
    );

    const handleMessage = useCallback(
        (message: string) => {
            return navigateToChat({ message });
        },
        [navigateToChat],
    );

    const handleContinueChat = useCallback(
        (chatId: string) => {
            const destination = `${chatRoute}?chat=${encodeURIComponent(chatId)}`;
            return navigateToDestination(destination);
        },
        [chatRoute, navigateToDestination],
    );

    const speechRecognition = useMemo(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }
        // Note: [🧠] We could have a mechanism to check if OPENAI_API_KEY is set on the server
        //       For now, we always provide OpenAiSpeechRecognition which uses proxy
        return new OpenAiSpeechRecognition();
    }, []);

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

    const initialMessage = useMemo(() => {
        if (!agent) {
            return 'Loading...';
        }
        const fallbackName = formatText('an AI Agent');
        return (
            agent.initialMessage ||
            spaceTrim(`
                Hello! I am ${fullname || agentName || fallbackName}.
                
                [Hello](?message=Hello, can you tell me about yourself?)
            `)
        );
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
            {hasVisibleExistingChats && (
                <ExistingChatsPanel
                    chats={visibleExistingChats}
                    formatText={formatText}
                    onOpenChat={(chatId) => void handleContinueChat(chatId)}
                    brandColorHex={brandColorHex}
                />
            )}
            <div
                className={`relative w-full h-[calc(100dvh-300px)] min-h-[350px] md:min-h-[420px] md:h-[500px] agent-chat-route-surface ${
                    isNavigatingToChat ? 'agent-chat-profile-transitioning' : ''
                }`}
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
                        onCreateAgent={handleCreateAgent}
                        isSaveButtonEnabled={false}
                        isCopyButtonEnabled={false}
                        className="h-full w-full rounded-[28px] bg-transparent"
                        buttonColor={brandColorHex}
                        style={{ background: 'transparent' }}
                        speechRecognition={speechRecognition}
                        speechRecognitionLanguage={speechRecognitionLanguage}
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
    onOpenChat: (chatId: string) => void;
    brandColorHex: string_color;
};

/**
 * Renders recent chat entries in a stylized card that matches the agent profile aesthetic.
 *
 * @private Profile chat helper.
 */
function ExistingChatsPanel({ chats, formatText, onOpenChat, brandColorHex }: ExistingChatsPanelProps) {
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
                <div className="mt-4 space-y-3">
                    {chats.map((chat) => {
                        const updatedAtDate = new Date(chat.updatedAt);
                        const isValidTimestamp = !Number.isNaN(updatedAtDate.getTime());
                        const relativeLabel = isValidTimestamp ? formatRelativeTimeLabel(chat.updatedAt) : '';
                        const timeLabel =
                            relativeLabel || (isValidTimestamp ? updatedAtDate.toLocaleString() : chat.updatedAt);
                        const title = chat.title || formatText('Untitled chat');
                        const previewText = hasMessageContent(chat.preview)
                            ? chat.preview
                            : formatText('No messages yet - start the conversation.');
                        const titleWithPreview = chat.preview ? `${title} — ${chat.preview}` : title;

                        return (
                            <button
                                key={chat.id}
                                type="button"
                                onClick={() => onOpenChat(chat.id)}
                                title={titleWithPreview}
                                className="flex w-full flex-col gap-2 rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-3 text-left shadow-sm shadow-slate-900/10 transition duration-150 hover:border-slate-400 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/80"
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
                                        dateTime={isValidTimestamp ? updatedAtDate.toISOString() : chat.updatedAt}
                                        title={isValidTimestamp ? updatedAtDate.toLocaleString() : chat.updatedAt}
                                        className="text-[0.65rem] font-semibold text-slate-400"
                                    >
                                        {timeLabel}
                                    </time>
                                </div>
                                <p className="text-[0.74rem] font-medium text-slate-500 line-clamp-2">{previewText}</p>
                            </button>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
