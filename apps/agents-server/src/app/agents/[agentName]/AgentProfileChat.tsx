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

type AgentProfileChatProps = {
    agentUrl: string_agent_url;
    agentName: string;
    fullname: string;
    brandColorHex: string_color;
    avatarSrc: string;
    isDeleted?: boolean;
    speechRecognitionLanguage?: string;
};

type ChatTransitionState =
    | {
          mode: 'message';
          message: string;
      }
    | {
          mode: 'quick';
      };

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
    const [transitionState, setTransitionState] = useState<ChatTransitionState | null>(null);
    const [transitionKey, setTransitionKey] = useState(0);
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
        void router.prefetch(chatRoute).catch(() => undefined);
    }, [chatRoute, router]);

    const navigateToChat = useCallback(
        async ({ message }: { message?: string }) => {
            const nextState: ChatTransitionState = message ? { mode: 'message', message } : { mode: 'quick' };
            setTransitionState(nextState);
            setTransitionKey((prev) => prev + 1);

            const query = message ? `?message=${encodeURIComponent(message)}` : '';
            try {
                await router.push(`${chatRoute}${query}`);
            } catch (error) {
                console.error('Failed to open chat page', error);
                setTransitionState(null);
            }
        },
        [chatRoute, router],
    );

    const handleMessage = useCallback(
        (message: string) => {
            void navigateToChat({ message });
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
        <>
            <div className="relative w-full h-[calc(100dvh-300px)] min-h-[350px] md:h-[500px]">
                <div className="absolute inset-x-4 top-3 z-10 flex justify-end md:top-4">
                    <button
                        type="button"
                        className="rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-black/30 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80 disabled:cursor-wait disabled:opacity-60 disabled:hover:bg-white/10"
                        disabled={Boolean(transitionState)}
                        onClick={handleOpenChatPage}
                    >
                        Open full chat
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
                            // <- TODO: [đź§ ] Maybe this shouldnt be there
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
            {transitionState && (
                <AgentChatTransitionOverlay
                    key={transitionKey}
                    brandColorHex={brandColorHex}
                    fullname={fullname}
                    message={transitionState.mode === 'message' ? transitionState.message : undefined}
                    transitionMode={transitionState.mode}
                />
            )}
        </>
    );
}

type AgentChatTransitionOverlayProps = {
    brandColorHex: string_color;
    fullname: string;
    message?: string;
    transitionMode: ChatTransitionState['mode'];
};

/**
 * Visual overlay that bridges the profile preview and the dedicated chat page.
 *
 * @private Transition helper for the Agents Server.
 */
function AgentChatTransitionOverlay({
    brandColorHex,
    fullname,
    message,
    transitionMode,
}: AgentChatTransitionOverlayProps) {
    const previewMessage = message ? spaceTrim(message) : undefined;
    const transitionLabel = transitionMode === 'message' ? 'Sending your message' : 'Opening full chat';

    return (
        <aside
            aria-live="polite"
            role="status"
            className="pointer-events-auto fixed inset-0 z-[70] flex items-center justify-center px-4 py-6"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/80 to-black/90 backdrop-blur-sm" />
            <div className="relative w-full max-w-4xl overflow-hidden rounded-[32px] border border-white/20 bg-white/5 p-6 shadow-[0_25px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-3xl text-white">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span
                            className="h-2.5 w-2.5 rounded-full animate-pulse"
                            style={{ backgroundColor: brandColorHex }}
                        />
                        <div>
                            <p className="text-lg font-semibold leading-tight">Opening full chat</p>
                            <p className="text-[11px] uppercase tracking-[0.3em] text-white/70">{transitionLabel}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end text-[11px] uppercase tracking-[0.3em] text-white/60">
                        <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-pulse" />
                        <span>Profile -&gt; Chat</span>
                    </div>
                </div>
                <p className="mt-4 text-sm text-white/70">
                    {`We are taking ${fullname || 'your agent'} into the full-screen chat experience.`}
                </p>
                {previewMessage && (
                    <div className="mt-6 space-y-2 rounded-2xl border border-white/10 bg-white/10 p-4 shadow-inner shadow-black/40">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-white/60">Message preview</p>
                        <p className="text-base leading-relaxed text-white whitespace-pre-wrap">{previewMessage}</p>
                    </div>
                )}
            </div>
            <span className="sr-only">
                {previewMessage ? `${transitionLabel} with message: ${previewMessage}` : transitionLabel}
            </span>
        </aside>
    );
}
