import { describe, expect, it, jest } from '@jest/globals';
import type { ChatPromptResult } from '../../../../src/execution/PromptResult';
import { createChatStreamHandler } from './createChatStreamHandler';

/**
 * Minimal stream tool-call payload used in handler tests.
 */
type TestToolCall = {
    name: string;
    arguments?: unknown;
    result?: unknown;
};

/**
 * Minimal chat chunk shape accepted by `createChatStreamHandler`.
 */
type TestChatChunk = {
    content?: string;
    toolCalls?: ReadonlyArray<TestToolCall>;
};

/**
 * Creates a minimal chat chunk for stream-handler tests.
 */
function createChatChunk(partial: TestChatChunk): ChatPromptResult {
    return partial as ChatPromptResult;
}

describe('createChatStreamHandler', () => {
    it('emits incremental text deltas based on previous content', () => {
        const emittedDeltas: Array<string> = [];
        const onDelta = jest.fn((delta: string) => {
            emittedDeltas.push(delta);
        });

        const streamHandler = createChatStreamHandler({ onDelta });
        streamHandler(createChatChunk({ content: 'Hello' }));
        streamHandler(createChatChunk({ content: 'Hello world' }));

        expect(emittedDeltas).toEqual(['Hello', ' world']);
    });

    it('forwards streamed tool calls', () => {
        const emittedToolCalls: Array<ReadonlyArray<TestToolCall>> = [];
        const onToolCalls = jest.fn((toolCalls: ReadonlyArray<TestToolCall>) => {
            emittedToolCalls.push(toolCalls);
        });

        const streamHandler = createChatStreamHandler({
            onDelta: () => undefined,
            onToolCalls,
        });

        const chunkToolCalls = [
            {
                name: 'web_search',
                arguments: { query: 'Promptbook' },
            },
        ];

        streamHandler(
            createChatChunk({
                content: 'Searching...',
                toolCalls: chunkToolCalls,
            }),
        );

        expect(emittedToolCalls).toEqual([chunkToolCalls]);
    });

    it('can emit tool calls without introducing a duplicate text delta', () => {
        const emittedDeltas: Array<string> = [];
        const emittedToolCalls: Array<ReadonlyArray<TestToolCall>> = [];
        const streamHandler = createChatStreamHandler({
            onDelta: (delta) => {
                emittedDeltas.push(delta);
            },
            onToolCalls: (toolCalls) => {
                emittedToolCalls.push(toolCalls);
            },
        });

        streamHandler(createChatChunk({ content: 'Planning answer' }));
        streamHandler(
            createChatChunk({
                content: 'Planning answer',
                toolCalls: [{ name: 'useBrowser', arguments: {} }],
            }),
        );

        expect(emittedDeltas).toEqual(['Planning answer']);
        expect(emittedToolCalls).toHaveLength(1);
    });
});
