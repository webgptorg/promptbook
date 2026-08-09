import type { UserChatRecord } from './UserChatRecord';
import { UserChatScopeError } from './UserChatScopeError';
import { createUserChat } from './createUserChat';
import { persistFrozenUserChat } from './persistFrozenUserChat';
import { updateUserChatMessages } from './updateUserChatMessages';

jest.mock('./createUserChat', () => ({
    createUserChat: jest.fn(),
}));

jest.mock('./updateUserChatMessages', () => ({
    updateUserChatMessages: jest.fn(),
}));

/**
 * Frozen chat record returned by persistence mocks.
 */
const FROZEN_CHAT: UserChatRecord = {
    id: 'team-job-copywriter',
    createdAt: '2026-08-08T12:00:00.000Z',
    updatedAt: '2026-08-08T12:00:00.000Z',
    lastMessageAt: '2026-08-08T12:00:00.000Z',
    title: null,
    userId: 7,
    agentPermanentId: 'copywriter',
    source: 'TEAM_MEMBER',
    messages: [],
    draftMessage: null,
};

describe('persistFrozenUserChat', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('creates a deterministic frozen chat when synchronization sees it for the first time', async () => {
        (updateUserChatMessages as jest.MockedFunction<typeof updateUserChatMessages>).mockRejectedValue(
            createMissingUserChatScopeError(),
        );
        (createUserChat as jest.MockedFunction<typeof createUserChat>).mockResolvedValue(FROZEN_CHAT);

        await expect(
            persistFrozenUserChat({
                userId: 7,
                agentPermanentId: 'copywriter',
                source: 'TEAM_MEMBER',
                chatId: 'team-job-copywriter',
                messages: [],
            }),
        ).resolves.toEqual(FROZEN_CHAT);

        expect(createUserChat).toHaveBeenCalledWith({
            userId: 7,
            agentPermanentId: 'copywriter',
            source: 'TEAM_MEMBER',
            chatId: 'team-job-copywriter',
            messages: [],
        });
    });

    it('does not turn scope mismatches into a new chat', async () => {
        const scopeMismatchError = new UserChatScopeError('USER_CHAT_SCOPE_AGENT_MISMATCH', 'Wrong agent scope.', {
            operation: 'update_messages',
            requestedScope: {
                userId: 7,
                agentPermanentId: 'copywriter',
                chatId: 'team-job-copywriter',
            },
            locatedScope: {
                userId: 7,
                agentPermanentId: 'other-agent',
                chatId: 'team-job-copywriter',
            },
            likelyCause: 'A different agent owns the chat id.',
        });
        (updateUserChatMessages as jest.MockedFunction<typeof updateUserChatMessages>).mockRejectedValue(
            scopeMismatchError,
        );

        await expect(
            persistFrozenUserChat({
                userId: 7,
                agentPermanentId: 'copywriter',
                source: 'TEAM_MEMBER',
                chatId: 'team-job-copywriter',
                messages: [],
            }),
        ).rejects.toBe(scopeMismatchError);

        expect(createUserChat).not.toHaveBeenCalled();
    });
});

/**
 * Creates the branded missing-chat condition used by an idempotent first synchronization.
 */
function createMissingUserChatScopeError(): UserChatScopeError {
    return new UserChatScopeError('USER_CHAT_NOT_FOUND', 'Chat does not exist yet.', {
        operation: 'update_messages',
        requestedScope: {
            userId: 7,
            agentPermanentId: 'copywriter',
            chatId: 'team-job-copywriter',
        },
        locatedScope: null,
        likelyCause: 'The first transcript synchronization has not created the chat yet.',
    });
}
