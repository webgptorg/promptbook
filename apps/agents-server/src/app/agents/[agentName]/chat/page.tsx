'use client';

import { AgentChat } from '@promptbook-local/components';
import { Agent, book } from '@promptbook-local/core';
// import { RemoteLlmExecutionTools } from '@promptbook-local/remote-client';
import { MockedEchoLlmExecutionTools } from '@promptbook-local/fake-llm';
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

    return (
        <main className={`w-screen h-screen`}>
            <AgentChat className={`w-full h-full`} agent={agent} />
        </main>
    );
}

/**
 * TODO: [🚗] Components and pages here should be just tiny UI wraper around proper agent logic and conponents
 */
