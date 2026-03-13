import { describe, expect, it } from '@jest/globals';
import { createUserChatTimeoutActivity } from './createUserChatTimeoutActivity';

describe('createUserChatTimeoutActivity', () => {
    it('returns empty activity when a chat has no active timeouts', () => {
        expect(createUserChatTimeoutActivity([])).toEqual({
            count: 0,
            nearestDueAt: null,
        });
    });

    it('returns count and nearest due timestamp for active timeouts', () => {
        expect(
            createUserChatTimeoutActivity([
                { dueAt: '2026-03-13T13:49:00.000Z' },
                { dueAt: '2026-03-13T12:49:00.000Z' },
                { dueAt: '2026-03-13T14:49:00.000Z' },
            ]),
        ).toEqual({
            count: 3,
            nearestDueAt: '2026-03-13T12:49:00.000Z',
        });
    });
});
