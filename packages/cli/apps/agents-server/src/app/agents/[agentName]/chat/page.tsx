'use client';

import { LlmChat } from '@promptbook-local/components';
import { Agent, book } from '@promptbook-local/core';
// import { RemoteLlmExecutionTools } from '@promptbook-local/remote-client';
import { MockedEchoLlmExecutionTools } from '@promptbook-local/fake-llm';
import { spaceTrim } from '@promptbook-local/utils';
import { useMemo } from 'react';

export default function AgentChatBook() {
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

        /*/
        const llm = new OpenAiAssistantExecutionTools({
            dangerouslyAllowBrowser: true,
            isCreatingNewAssistantsAllowed: true, // <- TODO: !!! Test without whether warning is shown
            apiKey: '!!!!!!',
            assistantId: 'asst_xI94Elk27nssnwAUkG2Cmok8', // <- TODO: [🧠] Make dynamic
            isVerbose: true,
        });
        /**/

        /**/
        const llm = new MockedEchoLlmExecutionTools({});
        /**/

        const agent = new Agent({
            executionTools: {
                llm,
            },
            agentSource: book`---`,
            isVerbose: true,
        });

        return agent;
    }, []);

    const llmTools = useMemo(() => {
        const llmTools = agent.getLlmExecutionTools();
        return llmTools;
    }, [agent]);

    return (
        /*
        <AgentChat className="w-full h-full" persistenceKey="marigold-chat" {...{ agent }} />
        TODO: [👤] !!! Move to `AgentChat` component
        */
        <main className={`w-screen h-screen`}>
            <AgentChat
                className={`w-full h-full`}
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
                        // agentSource,
                    },
                    {
                        name: 'USER',
                        fullname: 'User',
                        color: '#115EB6',
                        isMe: true,
                    },
                ]}
                {...{ llmTools }}
            />
        </main>
    );
}

/**
 * TODO: [🚗] Components and pages here should be just tiny UI wraper around proper agent logic and conponents
 */
