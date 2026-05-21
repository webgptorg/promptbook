import {
    createLocalChatMessageFileName,
    createLocalUserChatJobMetadata,
    getLocalUserChatJobMetadata,
    withoutLocalUserChatJobMetadata,
    withLocalUserChatJobMetadata,
} from './LocalUserChatJobMetadata';
import { LOCAL_USER_CHAT_JOB_PARAMETERS_KEY } from './localChatRunnerConstants';

describe('LocalUserChatJobMetadata', () => {
    it('creates stable local chat message file paths from the original thread timestamp', () => {
        expect(createLocalChatMessageFileName('chat/with spaces', '2026-05-21T10:00:00.000Z')).toBe(
            '2026-05-21-chat-with-spaces.book',
        );

        expect(
            createLocalUserChatJobMetadata({
                agentDirectoryName: 'agent-local',
                threadId: 'chat-1',
                threadCreatedAt: '2026-05-21T10:00:00.000Z',
                queuedAt: '2026-05-21T10:01:00.000Z',
                expectedMessagesBeforeAnswer: 3,
            }),
        ).toEqual(
            expect.objectContaining({
                agentDirectoryName: 'agent-local',
                fileName: '2026-05-21-chat-1.book',
                queuedPath: 'messages/queued/2026-05-21-chat-1.book',
                finishedPath: 'messages/finished/2026-05-21-chat-1.book',
                failedPath: 'messages/failed/2026-05-21-chat-1.book',
            }),
        );
    });

    it('persists, reads, and clears local runner parameters', () => {
        const metadata = createLocalUserChatJobMetadata({
            agentDirectoryName: 'agent-local',
            threadId: 'chat-1',
            threadCreatedAt: '2026-05-21T10:00:00.000Z',
            queuedAt: '2026-05-21T10:01:00.000Z',
            expectedMessagesBeforeAnswer: 1,
        });
        const parameters = withLocalUserChatJobMetadata({ original: true }, metadata);

        expect(
            getLocalUserChatJobMetadata({
                parameters,
            }),
        ).toEqual(metadata);
        expect(withoutLocalUserChatJobMetadata(parameters)).toEqual({ original: true });
        expect(parameters).toHaveProperty(LOCAL_USER_CHAT_JOB_PARAMETERS_KEY);
    });
});
