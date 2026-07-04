import {
    createQueuedUserChatAssistantMessage,
    createQueuedUserChatUserMessage,
    createUserChatRunnerThreadMessages,
    resolveMessageLifecycleStateFromJobStatus,
    resolvePromptThreadBeforeUserMessage,
} from './userChatMessageLifecycle';

/**
 * Message payload for user chat.
 */
type UserChatMessage = Parameters<typeof resolvePromptThreadBeforeUserMessage>[0][number];

describe('userChatMessageLifecycle', () => {
    const createdAtIso = '2026-03-11T12:00:00.000Z' as NonNullable<UserChatMessage['createdAt']>;

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should create queued user and assistant messages with durable metadata', () => {
        const userMessage = createQueuedUserChatUserMessage({
            messageId: 'user-message',
            clientMessageId: 'client-message',
            content: 'Hello',
            attachments: [
                {
                    name: 'diagram.png',
                    type: 'image/png',
                    url: 'https://cdn.example.com/diagram.png',
                },
            ],
            replyingTo: {
                threadId: 'chat-1',
                messageId: 'assistant-0',
                sender: 'AGENT',
                content: 'Original message',
            },
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
            attachments: [
                {
                    name: 'diagram.png',
                    type: 'image/png',
                    url: 'https://cdn.example.com/diagram.png',
                },
            ],
            replyingTo: {
                threadId: 'chat-1',
                messageId: 'assistant-0',
                sender: 'AGENT',
                content: 'Original message',
            },
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
        expect(assistantMessage.progressCard).toBeUndefined();
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

    it('should include the configured initial agent message before the first runner user turn', async () => {
        const resolveInitialAgentMessage = jest.fn(() => 'Hello, I am ready to help.');
        const messages: Array<UserChatMessage> = [
            {
                id: 'user-1',
                sender: 'USER',
                content: 'Can you help me?',
                createdAt: createdAtIso,
                isComplete: true,
            },
            {
                id: 'assistant-1',
                sender: 'AGENT',
                content: '',
                createdAt: createdAtIso,
                isComplete: false,
            },
        ];

        expect(
            await createUserChatRunnerThreadMessages({
                messages,
                userMessageId: 'user-1',
                resolveInitialAgentMessage,
            }),
        ).toEqual([
            {
                sender: 'AGENT',
                content: 'Hello, I am ready to help.',
            },
            {
                sender: 'USER',
                content: 'Can you help me?',
            },
        ]);
        expect(resolveInitialAgentMessage).toHaveBeenCalledTimes(1);
    });

    it('should not repeat the configured initial agent message after the first runner user turn', async () => {
        const resolveInitialAgentMessage = jest.fn(() => 'Hello, I am ready to help.');
        const messages: Array<UserChatMessage> = [
            {
                id: 'user-1',
                sender: 'USER',
                content: 'First question',
                createdAt: createdAtIso,
                isComplete: true,
            },
            {
                id: 'assistant-1',
                sender: 'AGENT',
                content: 'First answer',
                createdAt: createdAtIso,
                isComplete: true,
            },
            {
                id: 'user-2',
                sender: 'USER',
                content: 'Second question',
                createdAt: createdAtIso,
                isComplete: true,
            },
        ];

        expect(
            await createUserChatRunnerThreadMessages({
                messages,
                userMessageId: 'user-2',
                resolveInitialAgentMessage,
            }),
        ).toEqual([
            {
                sender: 'USER',
                content: 'First question',
            },
            {
                sender: 'AGENT',
                content: 'First answer',
            },
            {
                sender: 'USER',
                content: 'Second question',
            },
        ]);
        expect(resolveInitialAgentMessage).not.toHaveBeenCalled();
    });

    it('should include attachment links and text previews in runner user messages', async () => {
        const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response('Quarterly revenue: 124000 USD', {
                headers: {
                    'content-type': 'text/plain; charset=utf-8',
                },
            }),
        );
        const messages: Array<UserChatMessage> = [
            {
                id: 'user-1',
                sender: 'USER',
                content: 'Please inspect this file.',
                createdAt: createdAtIso,
                isComplete: true,
                attachments: [
                    {
                        name: 'report.txt',
                        type: 'text/plain',
                        url: 'https://cdn.example.com/report.txt',
                    },
                ],
            },
        ];

        const runnerMessages = await createUserChatRunnerThreadMessages({
            messages,
            userMessageId: 'user-1',
            resolveInitialAgentMessage: () => null,
        });

        expect(fetchSpy).toHaveBeenCalledWith('https://cdn.example.com/report.txt', expect.any(Object));
        expect(runnerMessages).toHaveLength(1);
        expect(runnerMessages[0]!.content).toContain('Please inspect this file.');
        expect(runnerMessages[0]!.content).toContain('Attached files:');
        expect(runnerMessages[0]!.content).toContain(
            '- report.txt (text/plain): https://cdn.example.com/report.txt',
        );
        expect(runnerMessages[0]!.content).toContain('Attached file contents:');
        expect(runnerMessages[0]!.content).toContain('Quarterly revenue: 124000 USD');
    });

    it('should map durable job status values to chat lifecycle labels', () => {
        expect(resolveMessageLifecycleStateFromJobStatus('QUEUED')).toBe('queued');
        expect(resolveMessageLifecycleStateFromJobStatus('RUNNING')).toBe('running');
        expect(resolveMessageLifecycleStateFromJobStatus('FAILED')).toBe('failed');
        expect(resolveMessageLifecycleStateFromJobStatus('CANCELLED')).toBe('cancelled');
        expect(resolveMessageLifecycleStateFromJobStatus('COMPLETED')).toBe('completed');
    });
});
