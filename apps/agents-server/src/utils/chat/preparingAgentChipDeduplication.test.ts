import type { ChatMessage } from '../../../../../src/book-components/Chat/types/ChatMessage';
import { ChatPersistence } from '../../../../../src/book-components/Chat/utils/ChatPersistence';
import type { ToolCall } from '../../../../../src/types/ToolCall';
import { ASSISTANT_PREPARATION_TOOL_CALL_NAME } from '../../../../../src/types/ToolCall';
import { mergeToolCalls } from '../../../../../src/utils/toolCalls/mergeToolCalls';

/**
 * Creates a minimal assistant_preparation tool call for use in tests.
 *
 * @param phase - Preparation phase label stored in the tool call arguments.
 * @returns Minimal `assistant_preparation` tool call.
 */
function createPreparationToolCall(phase: string): ToolCall {
    return {
        name: ASSISTANT_PREPARATION_TOOL_CALL_NAME,
        arguments: { phase },
    };
}

/**
 * Creates a minimal non-preparation tool call for use in tests.
 *
 * @param name - Tool call name.
 * @returns Minimal tool call with the given name.
 */
function createGenericToolCall(name: string): ToolCall {
    return { name, arguments: { query: 'test' } };
}

/**
 * Counts the number of `assistant_preparation` tool calls in the given list.
 *
 * @param toolCalls - List of tool calls to scan.
 * @returns Number of preparation entries.
 */
function countPreparationToolCalls(toolCalls: ReadonlyArray<ToolCall>): number {
    return toolCalls.filter((tc) => tc.name === ASSISTANT_PREPARATION_TOOL_CALL_NAME).length;
}

// ---------------------------------------------------------------------------
// mergeToolCalls – assistant_preparation deduplication
// ---------------------------------------------------------------------------

describe('mergeToolCalls – assistant_preparation deduplication', () => {
    it('initial load: merging a single preparation tool call produces exactly one chip', () => {
        const result = mergeToolCalls(undefined, [createPreparationToolCall('Preparing AgentKit agent')]);

        expect(countPreparationToolCalls(result)).toBe(1);
    });

    it('streaming update: second preparation tool call with a different phase replaces the first one', () => {
        const existing: ReadonlyArray<ToolCall> = [createPreparationToolCall('Creating knowledge base')];
        const incoming: ReadonlyArray<ToolCall> = [createPreparationToolCall('Preparing AgentKit agent')];

        const result = mergeToolCalls(existing, incoming);

        expect(countPreparationToolCalls(result)).toBe(1);
        expect(result[0]!.arguments).toEqual({ phase: 'Preparing AgentKit agent' });
    });

    it('streaming update: multiple preparation tool calls in incoming list collapse into one', () => {
        const incoming: ReadonlyArray<ToolCall> = [
            createPreparationToolCall('Creating knowledge base'),
            createPreparationToolCall('Preparing AgentKit agent'),
        ];

        const result = mergeToolCalls(undefined, incoming);

        expect(countPreparationToolCalls(result)).toBe(1);
        // The last one should win
        expect(result[result.length - 1]!.arguments).toEqual({ phase: 'Preparing AgentKit agent' });
    });

    it('switching chat: second full message snapshot with preparation tool call does not accumulate duplicates', () => {
        // Simulates applying two successive snapshots from different chat threads
        const firstSnapshot: ReadonlyArray<ToolCall> = [createPreparationToolCall('Preparing AgentKit agent')];
        const secondSnapshot: ReadonlyArray<ToolCall> = [createPreparationToolCall('Preparing AgentKit agent')];

        const result = mergeToolCalls(firstSnapshot, secondSnapshot);

        expect(countPreparationToolCalls(result)).toBe(1);
    });

    it('non-preparation tool calls are preserved alongside the single preparation chip', () => {
        const existing: ReadonlyArray<ToolCall> = [
            createPreparationToolCall('Creating knowledge base'),
            createGenericToolCall('web_search'),
        ];
        const incoming: ReadonlyArray<ToolCall> = [createPreparationToolCall('Preparing AgentKit agent')];

        const result = mergeToolCalls(existing, incoming);

        expect(countPreparationToolCalls(result)).toBe(1);
        expect(result.some((tc) => tc.name === 'web_search')).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// ChatPersistence – stale ongoingToolCalls cleared on reload
// ---------------------------------------------------------------------------

describe('ChatPersistence – stale ongoingToolCalls cleared on reload', () => {
    const PERSISTENCE_KEY = 'test-preparing-agent-chip';

    beforeEach(() => {
        ChatPersistence.clearMessages(PERSISTENCE_KEY);
    });

    afterEach(() => {
        ChatPersistence.clearMessages(PERSISTENCE_KEY);
    });

    it('initial load: incomplete message with ongoingToolCalls does not restore preparation chip', () => {
        const incompleteMessage: ChatMessage = {
            id: 'assistant-1',
            sender: 'AGENT',
            content: '',
            isComplete: false,
            lifecycleState: 'running',
            ongoingToolCalls: [createPreparationToolCall('Preparing AgentKit agent')],
        };

        ChatPersistence.saveMessages(PERSISTENCE_KEY, [incompleteMessage]);
        const loaded = ChatPersistence.loadMessages(PERSISTENCE_KEY);

        expect(loaded).toHaveLength(1);
        expect(loaded[0]!.ongoingToolCalls).toBeUndefined();
    });

    it('initial load: complete message ongoingToolCalls are preserved as-is', () => {
        const completeMessage: ChatMessage = {
            id: 'assistant-1',
            sender: 'AGENT',
            content: 'Done',
            isComplete: true,
            lifecycleState: 'completed',
            ongoingToolCalls: undefined,
        };

        ChatPersistence.saveMessages(PERSISTENCE_KEY, [completeMessage]);
        const loaded = ChatPersistence.loadMessages(PERSISTENCE_KEY);

        expect(loaded).toHaveLength(1);
        expect(loaded[0]!.ongoingToolCalls).toBeUndefined();
    });

    it('switching chat: persisted incomplete message from a previous chat does not show preparation chip after reload', () => {
        const threadOneMessages: ReadonlyArray<ChatMessage> = [
            {
                id: 'user-1',
                sender: 'USER',
                content: 'Hello',
                isComplete: true,
                lifecycleState: 'completed',
            },
            {
                id: 'assistant-1',
                sender: 'AGENT',
                content: '',
                isComplete: false,
                lifecycleState: 'running',
                ongoingToolCalls: [createPreparationToolCall('Preparing AgentKit agent')],
            },
        ];

        const threadOneKey = `${PERSISTENCE_KEY}-thread-1`;
        ChatPersistence.saveMessages(threadOneKey, threadOneMessages);

        // Simulate a page reload by loading the messages from scratch
        const loaded = ChatPersistence.loadMessages(threadOneKey);

        const preparationChips = loaded
            .flatMap((m) => m.ongoingToolCalls ?? [])
            .filter((tc) => tc.name === ASSISTANT_PREPARATION_TOOL_CALL_NAME);
        expect(preparationChips).toHaveLength(0);

        ChatPersistence.clearMessages(threadOneKey);
    });

    it('during streaming: repeated saves of an incomplete message do not accumulate preparation chips on reload', () => {
        const messageId = 'assistant-streaming';

        // Simulate multiple incremental saves during streaming
        for (const phase of ['Creating knowledge base', 'Preparing AgentKit agent', 'Preparing AgentKit agent']) {
            ChatPersistence.saveMessages(PERSISTENCE_KEY, [
                {
                    id: messageId,
                    sender: 'AGENT',
                    content: '',
                    isComplete: false,
                    lifecycleState: 'running',
                    ongoingToolCalls: [createPreparationToolCall(phase)],
                },
            ]);
        }

        const loaded = ChatPersistence.loadMessages(PERSISTENCE_KEY);
        const preparationChips = loaded
            .flatMap((m) => m.ongoingToolCalls ?? [])
            .filter((tc) => tc.name === ASSISTANT_PREPARATION_TOOL_CALL_NAME);

        expect(preparationChips).toHaveLength(0);
    });
});
