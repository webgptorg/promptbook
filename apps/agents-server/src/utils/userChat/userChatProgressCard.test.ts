import type { ChatMessage, ToolCall } from '@promptbook-local/types';
import { createQueuedUserChatProgressCard, createRunningUserChatProgressCard } from './userChatProgressCard';

describe('userChatProgressCard', () => {
    const updatedAt = '2026-03-11T12:00:00.000Z' as NonNullable<ChatMessage['progressCard']>['updatedAt'];

    it('creates concrete queued progress for a new assistant placeholder', () => {
        const progressCard = createQueuedUserChatProgressCard(updatedAt);

        expect(progressCard).toMatchObject({
            title: 'Agent Progress',
            now: 'Your message is queued for the agent runner.',
            next: 'The runner will prepare the agent context and start generating the response.',
            updatedAt,
            isVisible: true,
        });
        expect(progressCard.items).toEqual([
            {
                id: 'user-chat-job-progress-queued',
                text: 'Request added to the chat queue',
                status: 'completed',
            },
            {
                id: 'user-chat-job-progress-waiting-for-runner',
                text: 'Waiting for an available agent runner',
                status: 'pending',
            },
        ]);
    });

    it('updates automatic progress from running job state and tool-call snapshots', () => {
        const toolCalls: ReadonlyArray<ToolCall> = [
            {
                name: 'web_search',
                idempotencyKey: 'search-1',
                state: 'PARTIAL',
                logs: [
                    {
                        title: 'Searching docs',
                    },
                ],
            },
            {
                name: 'project_read_file',
                idempotencyKey: 'read-1',
                result: 'Read complete',
            },
        ];
        const progressCard = createRunningUserChatProgressCard({
            currentProgressCard: createQueuedUserChatProgressCard(updatedAt),
            content: '',
            toolCalls,
            updatedAt,
        });

        expect(progressCard.now).toBe('Using Web search and Project read file.');
        expect(progressCard.items).toEqual([
            expect.objectContaining({
                id: 'user-chat-job-progress-queued',
                status: 'completed',
            }),
            expect.objectContaining({
                id: 'user-chat-job-progress-runtime-prepared',
                status: 'completed',
            }),
            expect.objectContaining({
                id: 'user-chat-job-progress-generating-response',
                text: 'Generating the assistant response',
                status: 'pending',
            }),
            {
                id: 'user-chat-job-progress-tool-search-1',
                text: 'Web search: Searching docs',
                status: 'pending',
            },
            {
                id: 'user-chat-job-progress-tool-read-1',
                text: 'Project read file completed',
                status: 'completed',
            },
        ]);
    });

    it('preserves model-authored progress cards instead of overwriting them', () => {
        const modelProgressCard: NonNullable<ChatMessage['progressCard']> = {
            title: 'Checking repository',
            now: 'Reading the existing implementation.',
            next: 'I will patch the durable chat route.',
            items: [
                {
                    id: 'analysis',
                    text: 'Analyzing current code',
                    status: 'pending',
                },
            ],
            updatedAt,
            isVisible: true,
        };

        expect(
            createRunningUserChatProgressCard({
                currentProgressCard: modelProgressCard,
                content: '',
                toolCalls: [
                    {
                        name: 'project_read_file',
                        state: 'PENDING',
                    },
                ],
                updatedAt,
            }),
        ).toBe(modelProgressCard);
    });
});
