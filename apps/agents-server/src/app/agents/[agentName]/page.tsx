'use server';

import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
// import { BookEditor } from '@promptbook-local/components';
import { parseAgentSource } from '@promptbook-local/core';
import { headers } from 'next/headers';
import { $sideEffect } from '../../../../../../src/utils/organization/$sideEffect';
// import { Agent } from '@promptbook-local/core';
// import { RemoteLlmExecutionTools } from '@promptbook-local/remote-client';
// import { OpenAiAssistantExecutionTools } from '@promptbook-local/openai';

export default async function AgentPage() {
    // const [apiKey, setApiKey] = useStateInLocalStorage<string>('openai-apiKey', () => '');
    // const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);
    // const [isApiKeySectionCollapsed, setIsApiKeySectionCollapsed] = useState(!!apiKey);

    $sideEffect(/* Note: [🐶] This will ensure dynamic rendering of page and avoid Next.js pre-render */ headers());

    const collection = await $provideAgentCollectionForServer();
    const agentSourceSubject = await collection.getAgentSource('Gabriel Gray');
    const agentSource = agentSourceSubject.getValue();
    const agentProfile = parseAgentSource(agentSource);

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
        apiKey: '!!!!!!!!',
        assistantId: 'asst_xI94Elk27nssnwAUkG2Cmok8', // <- TODO: [🧠] Make dynamic
        isVerbose: true,
    });
    /**/

    /*/
    const agent = new Agent({
        executionTools: {
            llm,
        },
        agentSource, // TODO: !!!!! : [agentSource, setAgentSource],
        isVerbose: true,
    });

    const llmTools = agent.getLlmExecutionTools();
    /**/

    return (
        <div>
            <h1>{agentProfile.agentName}</h1>
        </div>
    );
}

/**
 * TODO: [🚗] Components and pages here should be just tiny UI wraper around proper agent logic and conponents
 */
