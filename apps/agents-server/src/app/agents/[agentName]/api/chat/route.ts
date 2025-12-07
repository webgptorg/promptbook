import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideOpenAiAssistantExecutionToolsForServer } from '@/src/tools/$provideOpenAiAssistantExecutionToolsForServer';
import { Agent, computeAgentHash, PROMPTBOOK_ENGINE_VERSION } from '@promptbook-local/core';
import { computeHash, serializeError } from '@promptbook-local/utils';
import { assertsError } from '../../../../../../../../src/errors/assertsError';

/**
 * Allow long-running streams: set to platform maximum (seconds)
 */
export const maxDuration = 300;

export async function OPTIONS(request: Request) {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}

export async function POST(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);

    const body = await request.json();
    const { message = 'Tell me more about yourself.', thread } = body;
    //      <- TODO: [🐱‍🚀] To configuration DEFAULT_INITIAL_HIDDEN_MESSAGE

    try {
        const collection = await $provideAgentCollectionForServer();
        // [▶️] const executionTools = await $provideExecutionToolsForServer();
        const openAiAssistantExecutionTools = await $provideOpenAiAssistantExecutionToolsForServer();
        const agentSource = await collection.getAgentSource(agentName);
        const agent = new Agent({
            isVerbose: true, // <- TODO: [🐱‍🚀] From environment variable
            executionTools: {
                // [▶️] ...executionTools,
                llm: openAiAssistantExecutionTools, // Note: Providing the OpenAI Assistant LLM tools to the Agent to be able to create its own Assistants GPTs
            },
            agentSource,
        });

        const agentHash = computeAgentHash(agentSource);
        const userAgent = request.headers.get('user-agent');
        const ip =
            request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            request.headers.get('x-client-ip');

        // Note: Capture language and platform information
        const language = request.headers.get('accept-language');
        // Simple platform extraction from userAgent parentheses content (e.g., Windows NT 10.0; Win64; x64)
        const platform = userAgent ? userAgent.match(/\(([^)]+)\)/)?.[1] : undefined; // <- TODO: [🧠] Improve platform parsing

        // Note: Identify the user message
        const userMessageContent = {
            role: 'USER',
            content: message,
        };

        // Record the user message
        const supabase = $provideSupabaseForServer();
        await supabase.from(await $getTableName('ChatHistory')).insert({
            createdAt: new Date().toISOString(),
            messageHash: computeHash(userMessageContent),
            previousMessageHash: null, // <- TODO: [🧠] How to handle previous message hash?
            agentName,
            agentHash,
            message: userMessageContent,
            promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
            url: request.url,
            ip,
            userAgent,
            language,
            platform,
            source: 'AGENT_PAGE_CHAT',
            apiKey: null,
        });

        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
            start(controller) {
                agent.callChatModelStream!(
                    {
                        title: `Chat with agent ${
                            agentName /* <- TODO: [🕛] There should be `agentFullname` not `agentName` */
                        }`,
                        parameters: {},
                        modelRequirements: {
                            modelVariant: 'CHAT',
                        },
                        content: message,
                        thread,
                    },
                    (chunk) => {
                        controller.enqueue(encoder.encode(chunk.content));
                    },
                )
                    .then(async (response) => {
                        // Note: Identify the agent message
                        const agentMessageContent = {
                            role: 'MODEL',
                            content: response.content,
                        };

                        // Record the agent message
                        await supabase.from(await $getTableName('ChatHistory')).insert({
                            createdAt: new Date().toISOString(),
                            messageHash: computeHash(agentMessageContent),
                            previousMessageHash: computeHash(userMessageContent),
                            agentName,
                            agentHash,
                            message: agentMessageContent,
                            promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
                            url: request.url,
                            ip,
                            userAgent,
                            language,
                            platform,
                            source: 'AGENT_PAGE_CHAT',
                            apiKey: null,
                        });

                        // Note: [🐱‍🚀] Save the learned data
                        const newAgentSource = agent.agentSource.value;
                        if (newAgentSource !== agentSource) {
                            await collection.updateAgentSource(agentName, newAgentSource);
                        }

                        controller.close();
                    })
                    .catch((error) => {
                        controller.error(error);
                    });
            },
        });

        return new Response(readableStream, {
            status: 200,
            headers: {
                'Content-Type': 'text/markdown',
                'Access-Control-Allow-Origin': '*', // <- Note: Allow embedding on other websites
            },
        });
    } catch (error) {
        assertsError(error);

        console.error(error);

        return new Response(
            JSON.stringify(
                serializeError(error),
                // <- TODO: [🐱‍🚀] Rename `serializeError` to `errorToJson`
                null,
                4,
                // <- TODO: [🐱‍🚀] Allow to configure pretty print for agent server
            ),
            {
                status: 400, // <- TODO: [🐱‍🚀] Make `errorToHttpStatusCode`
                headers: { 'Content-Type': 'application/json' },
            },
        );
    }
}
