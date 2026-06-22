import type { ChatMessage, ToolCall } from '@promptbook-local/types';
import { createQueuedUserChatProgressCard, createRunningUserChatProgressCard } from './userChatProgressCard';

describe('userChatProgressCard', () => {
    const updatedAt = '2026-03-11T12:00:00.000Z' as NonNullable<ChatMessage['progressCard']>['updatedAt'];

    it('creates user-friendly queued progress for a new assistant placeholder', () => {
        const progressCard = createQueuedUserChatProgressCard(updatedAt);

        expect(progressCard).toMatchObject({
            title: 'Agent Progress',
            now: 'Your message is in the queue.',
            next: 'The agent will pick it up and start working on your reply.',
            updatedAt,
            isVisible: true,
        });
        expect(progressCard.items).toEqual([
            {
                id: 'user-chat-job-progress-queued',
                text: 'Message added to the chat queue',
                status: 'completed',
            },
            {
                id: 'user-chat-job-progress-waiting-for-runner',
                text: 'Waiting for the agent to start',
                status: 'pending',
            },
        ]);
    });

    it('updates automatic progress with friendly tool actions and surfaces the latest log', () => {
        const toolCalls: ReadonlyArray<ToolCall> = [
            {
                name: 'web_search',
                idempotencyKey: 'search-1',
                state: 'PARTIAL',
                logs: [
                    {
                        title: 'Looking through documentation',
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

        expect(progressCard.now).toBe('Searching the web: Looking through documentation');
        expect(progressCard.next).toBe('The results will be turned into your answer.');
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
                text: 'Thinking through your request',
                status: 'pending',
            }),
            {
                id: 'user-chat-job-progress-tool-search-1',
                text: 'Searching the web: Looking through documentation',
                status: 'pending',
            },
            {
                id: 'user-chat-job-progress-tool-read-1',
                text: 'Reading a project file done',
                status: 'completed',
            },
        ]);
    });

    it('shows writing progress once the model has started streaming the answer', () => {
        const progressCard = createRunningUserChatProgressCard({
            currentProgressCard: createQueuedUserChatProgressCard(updatedAt),
            content: 'Here is what I found:',
            toolCalls: [],
            updatedAt,
        });

        expect(progressCard.now).toBe('Writing the answer for you.');
        expect(progressCard.next).toBe('Finishing up the answer.');
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
                text: 'Writing the answer for you',
                status: 'completed',
            }),
        ]);
    });

    it('hides the internal agent_progress tool from the user-facing checklist', () => {
        const progressCard = createRunningUserChatProgressCard({
            currentProgressCard: createQueuedUserChatProgressCard(updatedAt),
            content: '',
            toolCalls: [
                {
                    name: 'agent_progress',
                    idempotencyKey: 'progress-1',
                    state: 'COMPLETE',
                },
            ],
            updatedAt,
        });

        expect(progressCard.items.map((item) => item.id)).toEqual([
            'user-chat-job-progress-queued',
            'user-chat-job-progress-runtime-prepared',
            'user-chat-job-progress-generating-response',
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
