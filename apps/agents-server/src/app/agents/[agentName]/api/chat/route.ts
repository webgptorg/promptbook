import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideOpenAiAssistantExecutionToolsForServer } from '@/src/tools/$provideOpenAiAssistantExecutionToolsForServer';
import { Agent } from '@promptbook-local/core';
import { serializeError } from '@promptbook-local/utils';
import { assertsError } from '../../../../../../../../src/errors/assertsError';

export async function GET(request: Request, { params }: { params: { agentName: string } }) {
    const { agentName } = params;
    const { searchParams } = new URL(request.url);
    const message = searchParams.get('message') || 'Tell me more about yourself.';
    //                                               <- TODO: !!!! To configuration DEFAULT_INITIAL_HIDDEN_MESSAGE

    try {
        const collection = await $provideAgentCollectionForServer();
        // [▶️] const executionTools = await $provideExecutionToolsForServer();
        const openAiAssistantExecutionTools = await $provideOpenAiAssistantExecutionToolsForServer();
        const agentSource = await collection.getAgentSource(agentName);
        const agent = new Agent({
            isVerbose: true, // <- TODO: !!! From environment variable
            executionTools: {
                // [▶️] ...executionTools,
                llm: openAiAssistantExecutionTools, // Note: Providing the OpenAI Assistant LLM tools to the Agent to be able to create its own Assistants GPTs
            },
            agentSource,
        });
        const llmTools = agent.getLlmExecutionTools();

        const response = await llmTools.callChatModel!({
            title: `Chat with agent ${agentName}`,
            parameters: {},
            modelRequirements: {
                modelVariant: 'CHAT',
            },
            content: message,
        });

        return new Response(response.content, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
        });
    } catch (error) {
        assertsError(error);

        console.error(error);

        return new Response(
            JSON.stringify(
                serializeError(error),
                // <- TODO: !!! Rename `serializeError` to `errorToJson`
                null,
                4,
                // <- TODO: !!! Allow to configure pretty print for agent server
            ),
            {
                status: 400, // <- TODO: !!! Make `errorToHttpStatusCode`
                headers: { 'Content-Type': 'application/json' },
            },
        );
    }
}
