import { describe, expect, it } from '@jest/globals';
import {
    createExternalChatMessageFileName,
    createExternalUserChatJobMetadata,
} from './ExternalUserChatJobMetadata';

describe('ExternalUserChatJobMetadata', () => {
    it('creates thread filenames with the original thread creation date prefix', () => {
        expect(createExternalChatMessageFileName('chat-thread-42', '2026-05-14T16:32:15.341Z')).toBe(
            '2026-05-14-chat-thread-42.book',
        );
    });

    it('reuses the dated thread filename across queued, finished, and failed paths', () => {
        expect(
            createExternalUserChatJobMetadata({
                repositoryFullName: 'promptbook/agent-demo',
                threadId: 'chat thread 42',
                threadCreatedAt: '2026-05-14T16:32:15.341Z',
                queuedAt: '2026-05-15T10:00:00.000Z',
                expectedMessagesBeforeAnswer: 3,
            }),
        ).toEqual(
            expect.objectContaining({
                fileName: '2026-05-14-chat-thread-42.book',
                queuedPath: 'messages/queued/2026-05-14-chat-thread-42.book',
                finishedPath: 'messages/finished/2026-05-14-chat-thread-42.book',
                failedPath: 'messages/failed/2026-05-14-chat-thread-42.book',
            }),
        );
    });

    it('rejects invalid thread creation timestamps', () => {
        expect(() => createExternalChatMessageFileName('chat-thread-42', 'not-a-date')).toThrow(
            'Invalid chat thread creation timestamp "not-a-date".',
        );
    });
});
