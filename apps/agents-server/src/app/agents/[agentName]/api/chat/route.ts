import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideOpenAiAgentKitExecutionToolsForServer } from '@/src/tools/$provideOpenAiAgentKitExecutionToolsForServer';
import { AgentKitCacheManager } from '@/src/utils/cache/AgentKitCacheManager';
import { ensureNonEmptyChatContent } from '@/src/utils/chat/ensureNonEmptyChatContent';
import { createChatStreamHandler } from '@/src/utils/createChatStreamHandler';
import { getWellKnownAgentUrl } from '@/src/utils/getWellKnownAgentUrl';
import { composePromptParametersWithMemoryContext } from '@/src/utils/memoryRuntimeContext';
import { resolveCurrentUserMemoryIdentity } from '@/src/utils/userMemory';
import { Agent, computeAgentHash, PROMPTBOOK_ENGINE_VERSION, RemoteAgent } from '@promptbook-local/core';
import { $getCurrentDate, computeHash, serializeError } from '@promptbook-local/utils';
import { assertsError } from '../../../../../../../../src/errors/assertsError';
import { ASSISTANT_PREPARATION_TOOL_CALL_NAME } from '../../../../../../../../src/types/ToolCall';
import { keepUnused } from '../../../../../../../../src/utils/organization/keepUnused';
import { respondIfClientVersionIsOutdated } from '../../../../../utils/clientVersionGuard';
import { isAgentDeleted } from '../../_utils';

/**
 * Allow long-running streams: set to platform maximum (seconds)
 */
export const maxDuration = 300;

/**
 * Builds a preparation tool call payload for the chat stream.
 */
function createAssistantPreparationToolCall(phase: string) {
    return {
        name: ASSISTANT_PREPARATION_TOOL_CALL_NAME,
        arguments: { phase },
        createdAt: $getCurrentDate(),
    };
}

export async function OPTIONS(request: Request) {
    keepUnused(request);

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

    const versionMismatchResponse = respondIfClientVersionIsOutdated(request, 'stream');
    if (versionMismatchResponse) {
        return versionMismatchResponse;
    }

    // Check if agent is deleted
    if (await isAgentDeleted(agentName)) {
        return new Response(
            JSON.stringify({
                error: {
                    message: 'This agent has been deleted. You can restore it from the Recycle Bin.',
                    type: 'agent_deleted',
                },
            }),
            {
                status: 410, // Gone - indicates the resource is no longer available
                headers: { 'Content-Type': 'application/json' },
            },
        );
    }

    const body = await request.json();
    const {
        message = 'Tell me more about yourself.',
        thread,
        attachments = [],
        parameters: rawParameters = {},
    } = body;
    //      <- TODO: [🐱‍🚀] To configuration DEFAULT_INITIAL_HIDDEN_MESSAGE

    try {
        const collection = await $provideAgentCollectionForServer();
        // [▶️] const executionTools = await $provideExecutionToolsForServer();
        const agentId = await collection.getAgentPermanentId(agentName);
        const agentSource = await collection.getAgentSource(agentName);
        const currentUserIdentity = await resolveCurrentUserMemoryIdentity();
        const incomingParameters =
            rawParameters && typeof rawParameters === 'object' && !Array.isArray(rawParameters)
                ? (rawParameters as Record<string, unknown>)
                : {};
        const promptParameters = composePromptParametersWithMemoryContext({
            baseParameters: incomingParameters,
            currentUserIdentity,
            agentPermanentId: agentId,
            agentName,
        });

        // Use AgentKitCacheManager for vector store caching
        const agentKitCacheManager = new AgentKitCacheManager({ isVerbose: true });
        const baseOpenAiTools = await $provideOpenAiAgentKitExecutionToolsForServer();

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
            attachments,
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
            async start(controller) {
                let hasMeaningfulDelta = false;

                /**
                 * Note: Tool calls are emitted once at the end from `response.toolCalls`.
                 * Streaming intermediate tool call snapshots can duplicate chips in the client UI.
                 */
                const handleStreamChunk = createChatStreamHandler({
                    onDelta: (deltaContent) => {
                        if (deltaContent.trim().length > 0) {
                            hasMeaningfulDelta = true;
                        }
                        controller.enqueue(encoder.encode(deltaContent));
                    },
                });

                try {
                    const agentKitResult = await agentKitCacheManager.getOrCreateAgentKitAgent(
                        agentSource,
                        agentName,
                        baseOpenAiTools,
                        {
                            includeDynamicContext: true,
                            agentId,
                            onCacheMiss: async () => {
                                const toolCall = createAssistantPreparationToolCall('Preparing AgentKit agent');
                                controller.enqueue(
                                    encoder.encode('\n' + JSON.stringify({ toolCalls: [toolCall] }) + '\n'),
                                );
                            },
                        },
                    );

                    const agent = new Agent({
                        isVerbose: true, // <- TODO: [🐱‍🚀] From environment variable
                        assistantPreparationMode: 'external',
                        executionTools: {
                            // [▶️] ...executionTools,
                            llm: agentKitResult.tools,
                        },
                        agentSource,
                        teacherAgent: await RemoteAgent.connect({
                            agentUrl: await getWellKnownAgentUrl('TEACHER'),
                        }), // <- [🦋]
                    });

                    const response = await agent.callChatModelStream!(
                        {
                            title: `Chat with agent ${
                                agentName /* <- TODO: [🕛] There should be `agentFullname` not `agentName` */
                            }`,
                            parameters: promptParameters,
                            modelRequirements: {
                                modelVariant: 'CHAT',
                            },
                            content: message,
                            thread,
                            attachments,
                        },
                        handleStreamChunk,
                    );

                    const normalizedResponse = ensureNonEmptyChatContent({
                        content: response.content,
                        context: `Agent chat ${agentName}`,
                    });

                    if (normalizedResponse.wasEmpty && !hasMeaningfulDelta) {
                        controller.enqueue(encoder.encode(normalizedResponse.content));
                    }

                    // Note: Identify the agent message
                    const agentMessageContent = {
                        role: 'MODEL',
                        content: normalizedResponse.content,
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

                    if (response.toolCalls && response.toolCalls.length > 0) {
                        controller.enqueue(
                            encoder.encode('\n' + JSON.stringify({ toolCalls: response.toolCalls }) + '\n'),
                        );
                    }

                    controller.close();
                } catch (error) {
                    controller.error(error);
                }
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
