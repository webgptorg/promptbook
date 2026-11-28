import { describe, expect, it } from '@jest/globals';
import { createUserChatRunningActivity } from './createUserChatRunningActivity';

describe('createUserChatRunningActivity', () => {
    it('prefers active durable job counts when available', () => {
        expect(
            createUserChatRunningActivity(
                {
                    updatedAt: '2026-03-13T12:49:00.000Z',
                    messages: [
                        {
                            sender: 'AGENT',
                            content: '',
                            isComplete: false,
                            lifecycleState: 'running',
                        },
                    ],
                },
                2,
                new Date('2026-03-13T12:50:00.000Z'),
            ),
        ).toEqual({
            count: 2,
        });
    });

    it('falls back to recent pending assistant placeholders for frozen external chats', () => {
        expect(
            createUserChatRunningActivity(
                {
                    updatedAt: '2026-03-13T12:49:00.000Z',
                    messages: [
                        {
                            sender: 'USER',
                            content: 'Hello',
                            isComplete: true,
                        },
                        {
                            sender: 'AGENT',
                            content: '',
                            isComplete: false,
                            lifecycleState: 'running',
                        },
                    ],
                },
                0,
                new Date('2026-03-13T12:50:00.000Z'),
            ),
        ).toEqual({
            count: 1,
        });
    });

    it('ignores stale external placeholders after the live-activity lease expires', () => {
        expect(
            createUserChatRunningActivity(
                {
                    updatedAt: '2026-03-13T12:49:00.000Z',
                    messages: [
                        {
                            sender: 'AGENT',
                            content: '',
                            isComplete: false,
                            lifecycleState: 'running',
                        },
                    ],
                },
                0,
                new Date('2026-03-13T12:56:00.000Z'),
            ),
        ).toEqual({
            count: 0,
        });
    });
});
