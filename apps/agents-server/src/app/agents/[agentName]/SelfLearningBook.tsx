'use client';

import { ResizablePanelsAuto } from '@common/components/ResizablePanelsAuto/ResizablePanelsAuto';
import { useStateInLocalStorage } from '@common/hooks/useStateInLocalStorage';
import { BookEditor, LlmChat } from '@promptbook-local/components';
import { Agent, book } from '@promptbook-local/core';
// import { RemoteLlmExecutionTools } from '@promptbook-local/remote-client';
import { OpenAiAssistantExecutionTools } from '@promptbook-local/openai';
import type { string_book } from '@promptbook-local/types';
import { spaceTrim } from '@promptbook-local/utils';
import { useMemo, useState } from 'react';

export function SelfLearningBook() {
    const [apiKey, setApiKey] = useStateInLocalStorage<string>('openai-apiKey', () => '');
    const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);
    const [isApiKeySectionCollapsed, setIsApiKeySectionCollapsed] = useState(!!apiKey);

    const [agentSource, setAgentSource] = useStateInLocalStorage<string_book>(
        'marigold-agentSource-1',
        // TODO: !!! Uplad image to ptbk.io CDN
        () => book`
            Marigold

            META IMAGE https://westlandsuk.co.uk/wp-content/uploads/2021/06/Inspired.MarigoldFlowers_CMYK_40mm.jpg
            META COLOR #EC810B

            PERSONA You are writing stories about Witcher
            RULE Do not talk about our world, only about the Witcher universe

            KNOWLEDGE {Geralt of Rivia}
            Geralt of Rivia is a witcher, a monster hunter for hire, known for his white hair and cat-like eyes.
            He possesses superhuman abilities due to mutations he underwent during the Trial of the Grasses.
            Geralt is skilled in swordsmanship, alchemy, and magic signs.
            He is often accompanied by his horse, Roach, and has a complex relationship with {Yennefer of Vengerberg},
            a powerful sorceress, and {Ciri}, his adopted daughter with a destiny intertwined with his own.
            His secret word is "Apple".

            KNOWLEDGE {Yennefer of Vengerberg}
            Yennefer of Vengerberg is a formidable sorceress known for her beauty, intelligence, and temper.
            She has a complicated past, having been born with a hunchback and later transformed through magic.
            Yennefer is deeply connected to Geralt of Rivia, with whom she shares a tumultuous romantic relationship.
            She is also a mother figure to {Ciri}, whom she trains in the ways of magic.
            Her secret word is "Banana".

            KNOWLEDGE {Ciri}
            Ciri, also known as {Cirilla Fiona Elen Riannon}, is a young woman with a mysterious past and a powerful destiny.
            She is the daughter of {Poviss}, the ruler of the kingdom of Cintra, and possesses the Elder Blood, which grants her extraordinary abilities.
            Ciri is a skilled fighter and has been trained in the ways of the sword by Geralt of Rivia.
            Her destiny is intertwined with that of Geralt and Yennefer, as they both seek to protect her from those who would exploit her powers.
            Her secret word is "Cherry".
            
        `,
    );

    const agent = useMemo(() => {
        /*/
        // TODO: !!! Try working with `RemoteLlmExecutionTools`
        const llm = new RemoteLlmExecutionTools({
            remoteServerUrl: 'https://promptbook.s5.ptbk.io/',
            identification: {
                isAnonymous: false,
                appId: '20a65fee-59f6-4d05-acd0-8e5ae8345488',
            },
        });
        /**/

        /**/
        const llm = new OpenAiAssistantExecutionTools({
            dangerouslyAllowBrowser: true,
            isCreatingNewAssistantsAllowed: true, // <- TODO: !!! Test without whether warning is shown
            apiKey,
            assistantId: 'asst_xI94Elk27nssnwAUkG2Cmok8', // <- TODO: [🧠] Make dynamic
            isVerbose: true,
        });
        /**/

        const agent = new Agent({
            executionTools: {
                llm,
            },
            agentSource: [agentSource, setAgentSource],
            isVerbose: true,
        });

        return agent;
    }, [agentSource, setAgentSource, apiKey]);

    const llmTools = useMemo(() => {
        const llmTools = agent.getLlmExecutionTools();
        return llmTools;
    }, [agent]);

    return (
        <div className="min-h-screen relative">
            {/* Floating API Key Configuration */}
            <div className={`fixed top-24 right-4 z-50 ${isApiKeySectionCollapsed ? '' : 'min-w-[400px]'}`}>
                {isApiKeySectionCollapsed ? (
                    // Collapsed state - small corner button
                    <button
                        onClick={() => setIsApiKeySectionCollapsed(false)}
                        className="bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-full p-2 shadow-lg transition-all flex items-center gap-1"
                        title="Configure OpenAI API Key"
                    >
                        <span className="text-sm">🔑</span>
                    </button>
                ) : (
                    // Expanded state - full configuration panel
                    <div className="bg-white border border-gray-300 rounded-lg shadow-lg">
                        <div className="flex items-center justify-between p-3 bg-gray-100 rounded-t-lg border-b border-gray-300">
                            <span className="font-medium text-sm">OpenAI API Key</span>
                            <button
                                onClick={() => setIsApiKeySectionCollapsed(true)}
                                className="text-gray-600 hover:text-gray-800 text-lg leading-none"
                                title="Collapse"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-3">
                            <label className="flex items-center gap-2">
                                <span className="text-sm font-medium whitespace-nowrap">API Key:</span>
                                <input
                                    type={isApiKeyVisible ? 'text' : 'password'}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="sk-proj-..."
                                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsApiKeyVisible(!isApiKeyVisible)}
                                    className="px-2 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
                                    title={isApiKeyVisible ? 'Hide API key' : 'Show API key'}
                                >
                                    {isApiKeyVisible ? '🙈' : '👁️'}
                                </button>
                            </label>
                        </div>
                    </div>
                )}
            </div>

            <ResizablePanelsAuto name="two-editors">
                <BookEditor
                    className="w-full h-full"
                    height={null}
                    value={agentSource}
                    onChange={setAgentSource}
                    // className={styles.BookEditor}
                    isVerbose={false}
                    isBorderRadiusDisabled
                    onFileUpload={(file) => {
                        return file.name;
                    }}
                />
                {/*
                <AgentChat className="w-full h-full" persistenceKey="marigold-chat" {...{ agent }} />
                TODO: !!! Move to `AgentChat` component
                */}
                <LlmChat
                    title={`Chat with ${agent.agentName || 'Agent'}`}
                    // TODO: !!! Pass persistenceKey="chat-with-pavol-hejny"
                    userParticipantName="USER"
                    llmParticipantName="AGENT" // <- TODO: [🧠] Maybe dynamic agent id
                    initialMessages={[
                        {
                            from: 'AGENT',
                            content: spaceTrim(`
                                
                                Hello! I am ${agent.agentName || 'an AI Agent'}.
                                
                                [Hello](?message=Hello, can you tell me about yourself?)
                            `),
                        },
                    ]}
                    participants={[
                        {
                            name: 'AGENT',
                            fullname: agent.agentName || 'Agent',
                            avatarSrc: agent.meta.image,
                            color: agent.meta.color,
                            isMe: false,
                            agentSource,
                        },
                        {
                            name: 'USER',
                            fullname: 'User',
                            color: '#115EB6',
                            isMe: true,
                        },
                    ]}
                    {...{ llmTools }}
                    className={`h-full flex flex-col`}
                />
            </ResizablePanelsAuto>
        </div>
    );
}

/**
 * TODO: !!!! Make self-learning book createAgentLlmExecutionTools, use bidirectional agentSource
 */