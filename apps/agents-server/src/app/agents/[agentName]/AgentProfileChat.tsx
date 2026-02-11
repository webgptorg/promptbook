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
};

/**
 * Browser `Document` extension that exposes the optional View Transition API.
 */
type DocumentWithViewTransition = Document & {
    startViewTransition?: (updateCallback: () => void) => void;
};

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
}: AgentProfileChatProps) {
    const router = useRouter();
    const [isCreatingAgent, setIsCreatingAgent] = useState(false);
    const [isNavigatingToChat, setIsNavigatingToChat] = useState(false);
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

    const navigateToChat = useCallback(
        ({ message }: { message?: string }) => {
            setIsNavigatingToChat(true);
            const query = hasMessageContent(message) ? `?message=${encodeURIComponent(message)}` : '';
            const destination = `${chatRoute}${query}`;

            return new Promise<void>((resolve) => {
                requestAnimationFrame(() => {
                    runRouteTransition(() => {
                        router.push(destination);
                        resolve();
                    });
                });
            });
        },
        [chatRoute, router],
    );

    const handleMessage = useCallback(
        (message: string) => {
            return navigateToChat({ message });
        },
        [navigateToChat],
    );

    const handleOpenChatPage = useCallback(() => {
        void navigateToChat({});
    }, [navigateToChat]);

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
        <div
            className={`relative w-full h-[calc(100dvh-300px)] min-h-[350px] md:h-[500px] agent-chat-route-surface ${
                isNavigatingToChat ? 'agent-chat-profile-transitioning' : ''
            }`}
        >
            <div className="absolute inset-x-4 top-3 z-10 flex justify-end md:top-4">
                <button
                    type="button"
                    className="rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-black/30 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80 disabled:cursor-wait disabled:opacity-60 disabled:hover:bg-white/10"
                    disabled={isNavigatingToChat}
                    onClick={handleOpenChatPage}
                >
                    {isNavigatingToChat ? 'Opening chat...' : 'Open full chat'}
                </button>
            </div>
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
    );
}
