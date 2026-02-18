import { describe, expect, it, jest } from '@jest/globals';
import { CHAT_STREAM_KEEP_ALIVE_TOKEN } from '../../constants/streaming';
import type { Prompt } from '../../types/Prompt';
import type { Parameters, string_agent_url } from '../../types/typeAliases';
import { RemoteAgent } from './RemoteAgent';

const SPLIT_INDEX_ONE = 10;
const SPLIT_INDEX_TWO = 1000;
const LARGE_PAYLOAD_SIZE = 1000;

/**
 * Creates a JSON response used by mocked fetch calls.
 */
function createJsonResponse(payload: unknown): Response {
    return new Response(JSON.stringify(payload), {
        headers: {
            'Content-Type': 'application/json',
        },
    });
}

/**
 * Creates a streaming markdown response from plain string chunks.
 */
function createStreamingResponse(chunks: ReadonlyArray<string>): Response {
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            for (const chunk of chunks) {
                controller.enqueue(encoder.encode(chunk));
            }

            controller.close();
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/markdown',
        },
    });
}

/**
 * Creates a minimal CHAT prompt for RemoteAgent tests.
 */
function createChatPrompt(content: string): Prompt {
    return {
        title: 'RemoteAgent stream parsing test',
        content,
        modelRequirements: {
            modelVariant: 'CHAT',
        },
        parameters: {} as Parameters,
    };
}

describe('RemoteAgent stream parsing', () => {
    it('parses a split tool-calls frame and keeps it out of visible content', async () => {
        const originalFetch = global.fetch;

        try {
            const largeNestedPayload = JSON.stringify({
                response: 'x'.repeat(LARGE_PAYLOAD_SIZE),
                toolCalls: [{ name: 'nested_tool', arguments: '{"query":"test"}', result: 'ok' }],
            });

            const toolCallLine = JSON.stringify({
                toolCalls: [
                    {
                        name: 'team_chat_c467984b9a',
                        arguments: '{"message":"Please provide one activation code.","context":"test"}',
                        result: largeNestedPayload,
                    },
                ],
            });

            const wrappedToolCallLine = `\n${toolCallLine}\n`;
            const wrappedToolCallChunks = [
                wrappedToolCallLine.slice(0, SPLIT_INDEX_ONE),
                wrappedToolCallLine.slice(SPLIT_INDEX_ONE, SPLIT_INDEX_TWO),
                wrappedToolCallLine.slice(SPLIT_INDEX_TWO),
            ];

            const fetchMock = jest
                .fn<typeof fetch>()
                .mockResolvedValueOnce(createJsonResponse({ agentName: 'TestRemoteAgent' }))
                .mockResolvedValueOnce(
                    createStreamingResponse([
                        `\n${CHAT_STREAM_KEEP_ALIVE_TOKEN}\n`,
                        'Activation code: A_748_192 bro.\n',
                        ...wrappedToolCallChunks,
                        `\n${CHAT_STREAM_KEEP_ALIVE_TOKEN}\n`,
                        'Bypass code: B_7QK_4M2 bro.',
                    ]),
                );

            global.fetch = fetchMock;

            const remoteAgent = await RemoteAgent.connect({
                agentUrl: 'https://example.com/agents/test' as string_agent_url,
            });

            const progressChunks: Array<string> = [];
            const result = await remoteAgent.callChatModelStream(createChatPrompt('hello'), (chunk) => {
                progressChunks.push(chunk.content);
            });

            expect(result.content).toBe('Activation code: A_748_192 bro.\nBypass code: B_7QK_4M2 bro.');
            expect(result.content).not.toContain('toolCalls');
            expect(result.toolCalls).toHaveLength(1);
            expect(result.toolCalls?.[0]?.name).toBe('team_chat_c467984b9a');
            expect(progressChunks.some((chunk) => chunk.includes('toolCalls'))).toBe(false);
        } finally {
            global.fetch = originalFetch;
        }
    });
});
