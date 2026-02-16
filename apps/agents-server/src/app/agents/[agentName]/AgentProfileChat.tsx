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
        <div className="flex w-full flex-col gap-3">
            {hasVisibleExistingChats && (
                <ExistingChatsPanel
                    chats={visibleExistingChats}
                    formatText={formatText}
                    onOpenChat={(chatId) => void handleContinueChat(chatId)}
                />
            )}
            <div
                className={`relative w-full h-[calc(100dvh-300px)] min-h-[350px] md:h-[500px] agent-chat-route-surface ${
                    isNavigatingToChat ? 'agent-chat-profile-transitioning' : ''
                }`}
            >
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
                    className="bg-transparent"
                    buttonColor={brandColorHex}
                    style={{ background: 'transparent' }}
                    speechRecognition={speechRecognition}
                    speechRecognitionLanguage={speechRecognitionLanguage}
                    visual={'STANDALONE'}
                />
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
};

/**
 * Renders quick buttons for recent chats so users can continue a conversation from the profile preview.
 *
 * @private Profile chat helper.
 */
function ExistingChatsPanel({ chats, formatText, onOpenChat }: ExistingChatsPanelProps) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm shadow-slate-200/60 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {formatText('Continue a previous chat')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
                {chats.map((chat) => (
                    <button
                        key={chat.id}
                        type="button"
                        onClick={() => onOpenChat(chat.id)}
                        title={chat.preview ? `${chat.title} — ${chat.preview}` : chat.title}
                        className="max-w-[16rem] flex-shrink-0 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-left transition hover:border-slate-400 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/80"
                    >
                        <span className="block max-w-full truncate text-sm font-semibold text-slate-900">
                            {chat.title}
                        </span>
                        {chat.preview ? (
                            <span className="mt-0.5 block max-w-full truncate text-[0.65rem] font-medium text-slate-500">
                                {chat.preview}
                            </span>
                        ) : null}
                    </button>
                ))}
            </div>
        </section>
    );
}
