import { getTeamMemberUserChatContext } from '../userChat/teamMemberUserChatContext';
import { persistFrozenUserChat } from '../userChat/persistFrozenUserChat';
import { USER_CHAT_SOURCES } from '../userChat/UserChatSource';
import type { ParsedLocalTeamConversation } from './parseLocalTeamConversations';
import { persistLocalTeamConversations } from './persistLocalTeamConversations';

jest.mock('../userChat/persistFrozenUserChat', () => ({
    persistFrozenUserChat: jest.fn(),
}));

/**
 * Parsed harness conversation used to verify durable frozen-chat persistence.
 */
const PARSED_TEAM_CONVERSATION = {
    transcriptFileName: 'copywriter--01.book',
    teammate: {
        permanentId: 'copywriter',
        agentName: 'Copywriter',
        url: 'https://agents.example.com/agents/copywriter',
        instructions: 'Suggest concise campaign hooks.',
        sourceFileName: 'copywriter.book',
    },
    conversation: [
        {
            sender: 'AGENT',
            name: 'Social Media Manager',
            content: 'Suggest a launch hook.',
        },
        {
            sender: 'TEAMMATE',
            name: 'Copywriter',
            content: 'Turn attention into qualified demos.',
        },
    ],
    toolCall: {
        name: 'team_chat_copywriter',
        state: 'COMPLETE',
    },
} satisfies ParsedLocalTeamConversation;

describe('persistLocalTeamConversations', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('stores a frozen teammate transcript linked back to its invoking primary chat', async () => {
        await expect(
            persistLocalTeamConversations({
                job: {
                    id: 'job-123',
                    userId: 7,
                    agentPermanentId: 'social-media-manager',
                    chatId: 'primary-chat-123',
                    queuedAt: '2026-08-08T12:00:00.000Z',
                },
                conversations: [PARSED_TEAM_CONVERSATION],
            }),
        ).resolves.toEqual([PARSED_TEAM_CONVERSATION.toolCall]);

        expect(persistFrozenUserChat).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 7,
                agentPermanentId: 'copywriter',
                source: USER_CHAT_SOURCES.TEAM_MEMBER,
                chatId: 'team-job-123-copywriter--01',
                messages: expect.arrayContaining([
                    expect.objectContaining({
                        sender: 'USER',
                        content: 'Suggest a launch hook.',
                        isComplete: true,
                    }),
                    expect.objectContaining({
                        sender: 'AGENT',
                        content: 'Turn attention into qualified demos.',
                        isComplete: true,
                    }),
                ]),
            }),
        );

        const persistedOptions = (persistFrozenUserChat as jest.MockedFunction<typeof persistFrozenUserChat>).mock
            .calls[0]?.[0];

        expect(persistedOptions).toBeDefined();
        expect(getTeamMemberUserChatContext(persistedOptions!.messages)).toEqual({
            version: 1,
            primaryAgentPermanentId: 'social-media-manager',
            primaryAgentName: 'Social Media Manager',
            primaryChatId: 'primary-chat-123',
        });
    });
});
