import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideOpenAiAgentKitExecutionToolsForServer } from '@/src/tools/$provideOpenAiAgentKitExecutionToolsForServer';
import { AgentKitCacheManager } from '@/src/utils/cache/AgentKitCacheManager';
import { ensureNonEmptyChatContent } from '@/src/utils/chat/ensureNonEmptyChatContent';
import { createChatHistoryRecorder } from '@/src/utils/chat/createChatHistoryRecorder';
import { createChatStreamHandler } from '@/src/utils/createChatStreamHandler';
import { getWellKnownAgentUrl } from '@/src/utils/getWellKnownAgentUrl';
import { composePromptParametersWithMemoryContext } from '@/src/utils/memoryRuntimeContext';
import { appendChatAttachmentContext, normalizeChatAttachments } from '@/src/utils/chat/chatAttachments';
import { resolveCurrentUserMemoryIdentity } from '@/src/utils/userMemory';
import { Agent, computeAgentHash, RemoteAgent } from '@promptbook-local/core';
import type { ChatMessage } from '@promptbook-local/components';
import { $getCurrentDate, serializeError } from '@promptbook-local/utils';
import { assertsError } from '../../../../../../../../src/errors/assertsError';
import { ASSISTANT_PREPARATION_TOOL_CALL_NAME } from '../../../../../../../../src/types/ToolCall';
import { keepUnused } from '../../../../../../../../src/utils/organization/keepUnused';
import { respondIfClientVersionIsOutdated } from '../../../../../utils/clientVersionGuard';
import { isAgentDeleted } from '../../_utils';
import {
    CHAT_STREAM_KEEP_ALIVE_INTERVAL_MS,
    CHAT_STREAM_KEEP_ALIVE_TOKEN,
} from '@/src/constants/streaming';
import { isPrivateModeEnabledFromRequest } from '@/src/utils/privateMode';

/**
 * Shape of the incoming chat API payload.
 *
 * `attachments` and `parameters` are normalized later, so they stay unknown here.
 */
type ChatRequestBody = {
    message?: unknown;
    thread?: ReadonlyArray<ChatMessage>;
    attachments?: unknown;
    parameters?: unknown;
};

/**
 * Extracts safe user message content from request payload.
 */
function resolveUserMessageContent(rawMessage: unknown): string {
    if (typeof rawMessage === 'string' && rawMessage.trim() !== '') {
        return rawMessage;
    }

    return 'Tell me more about yourself.';
}

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

    const body = (await request.json()) as ChatRequestBody;
    const message = resolveUserMessageContent(body.message);
    const thread = body.thread ? [...body.thread] : undefined;
    const attachments = normalizeChatAttachments(body.attachments);
    const rawParameters = body.parameters ?? {};
    const messageWithAttachmentContext = appendChatAttachmentContext(message, attachments);
    const isPrivateModeEnabled = isPrivateModeEnabledFromRequest(request);
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
            isPrivateModeEnabled,
        });

        // Use AgentKitCacheManager for vector store caching
        const agentKitCacheManager = new AgentKitCacheManager({ isVerbose: true });
        const baseOpenAiTools = await $provideOpenAiAgentKitExecutionToolsForServer();

        const agentHash = computeAgentHash(agentSource);

        // Note: Identify the user message
        const userMessageContent = {
            role: 'USER',
            content: message,
            attachments,
        };
        const recordChatHistoryMessage = await createChatHistoryRecorder({
            request,
            agentIdentifier: agentName,
            agentHash,
            source: 'AGENT_PAGE_CHAT',
            apiKey: null,
            isEnabled: !isPrivateModeEnabled,
        });
        const userMessageHash = await recordChatHistoryMessage({
            message: userMessageContent,
            previousMessageHash: null, // <- TODO: [🧠] How to handle previous message hash?
        });

        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
            async start(controller) {
                let hasMeaningfulDelta = false;
                let keepAliveInterval: ReturnType<typeof setInterval> | undefined;

                const sendKeepAlivePing = () => {
                    controller.enqueue(encoder.encode(`\n${CHAT_STREAM_KEEP_ALIVE_TOKEN}\n`));
                };

                sendKeepAlivePing();
                keepAliveInterval = setInterval(sendKeepAlivePing, CHAT_STREAM_KEEP_ALIVE_INTERVAL_MS);

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
                            content: messageWithAttachmentContext,
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

                    await recordChatHistoryMessage({
                        message: agentMessageContent,
                        previousMessageHash: userMessageHash,
                    });

                    // Note: [🐱‍🚀] Save the learned data
                    if (!isPrivateModeEnabled) {
                        const newAgentSource = agent.agentSource.value;
                        if (newAgentSource !== agentSource) {
                            await collection.updateAgentSource(agentName, newAgentSource);
                        }
                    }

                    if (response.toolCalls && response.toolCalls.length > 0) {
                        controller.enqueue(
                            encoder.encode('\n' + JSON.stringify({ toolCalls: response.toolCalls }) + '\n'),
                        );
                    }

                    controller.close();
                } catch (error) {
                    controller.error(error);
                } finally {
                    if (keepAliveInterval) {
                        clearInterval(keepAliveInterval);
                        keepAliveInterval = undefined;
                    }
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
