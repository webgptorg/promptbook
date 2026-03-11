import {
    createQueuedUserChatAssistantMessage,
    createQueuedUserChatUserMessage,
    resolveMessageLifecycleStateFromJobStatus,
    resolvePromptThreadBeforeUserMessage,
} from './userChatMessageLifecycle';

type UserChatMessage = Parameters<typeof resolvePromptThreadBeforeUserMessage>[0][number];

describe('userChatMessageLifecycle', () => {
    const createdAtIso = '2026-03-11T12:00:00.000Z' as NonNullable<UserChatMessage['createdAt']>;
    it('should create queued user and assistant messages with durable metadata', () => {
        const userMessage = createQueuedUserChatUserMessage({
            messageId: 'user-message',
            clientMessageId: 'client-message',
            content: 'Hello',
            createdAt: createdAtIso,
        });
        const assistantMessage = createQueuedUserChatAssistantMessage({
            messageId: 'assistant-message',
            jobId: 'job-1',
            createdAt: createdAtIso,
        });

        expect(userMessage).toMatchObject({
            id: 'user-message',
            sender: 'USER',
            content: 'Hello',
            clientMessageId: 'client-message',
            lifecycleState: 'completed',
            isComplete: true,
        });
        expect(assistantMessage).toMatchObject({
            id: 'assistant-message',
            sender: 'AGENT',
            content: '',
            jobId: 'job-1',
            lifecycleState: 'queued',
            isComplete: false,
        });
    });

    it('should resolve the prompt thread that existed before a queued user turn', () => {
        const messages: Array<UserChatMessage> = [
            {
                id: 'assistant-1',
                sender: 'AGENT',
                content: 'Hello there',
                createdAt: createdAtIso,
            },
            {
                id: 'user-1',
                sender: 'USER',
                content: 'Need help',
                createdAt: createdAtIso,
            },
            {
                id: 'assistant-2',
                sender: 'AGENT',
                content: 'Queued response',
                createdAt: createdAtIso,
                jobId: 'job-2',
                lifecycleState: 'queued',
                isComplete: false,
            },
            {
                id: 'user-2',
                sender: 'USER',
                content: 'Another question',
                createdAt: createdAtIso,
            },
        ];

        expect(resolvePromptThreadBeforeUserMessage(messages, 'user-2').map((message) => message.id)).toEqual([
            'assistant-1',
            'user-1',
            'assistant-2',
        ]);
        expect(resolvePromptThreadBeforeUserMessage(messages, 'missing')).toEqual([]);
    });

    it('should map durable job status values to chat lifecycle labels', () => {
        expect(resolveMessageLifecycleStateFromJobStatus('QUEUED')).toBe('queued');
        expect(resolveMessageLifecycleStateFromJobStatus('RUNNING')).toBe('running');
        expect(resolveMessageLifecycleStateFromJobStatus('FAILED')).toBe('failed');
        expect(resolveMessageLifecycleStateFromJobStatus('CANCELLED')).toBe('cancelled');
        expect(resolveMessageLifecycleStateFromJobStatus('COMPLETED')).toBe('completed');
    });
});
