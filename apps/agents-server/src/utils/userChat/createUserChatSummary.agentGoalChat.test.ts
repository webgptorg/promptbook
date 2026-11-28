import { buildAgentGoalChatId } from '../agentGoalChat/agentGoalChatIdentity';
import { createUserChatSummaryFromSeed, type UserChatSummarySeed } from './createUserChatSummary';
import { USER_CHAT_SOURCES } from './UserChatSource';

/**
 * Permanent id of the agent used across the goal-chat summary cases.
 */
const AGENT_PERMANENT_ID = 'agent-kgj7sjiccnnfh5';

/**
 * Database user id of the viewer looking at the chat list.
 */
const VIEWER_USER_ID = 42;

/**
 * Builds one summary seed for the tested chat variants.
 */
function createSeed(overrides: Partial<UserChatSummarySeed>): UserChatSummarySeed {
    return {
        id: 'Xq7Lp2mNb4Tk9F',
        createdAt: '2026-08-06T10:00:00.000Z',
        updatedAt: '2026-08-06T10:00:00.000Z',
        lastMessageAt: '2026-08-06T10:00:00.000Z',
        title: null,
        source: USER_CHAT_SOURCES.WEB_UI,
        userId: VIEWER_USER_ID,
        messagesCount: 1,
        firstUserMessageContent: '',
        lastPreviewMessageContent: '',
        pendingAssistantMessageCount: 0,
        ...overrides,
    };
}

describe('createUserChatSummaryFromSeed for agent goal chats', () => {
    it('marks the goal chat as read-only but never as somebody else’s chat', () => {
        const summary = createUserChatSummaryFromSeed(
            createSeed({
                id: buildAgentGoalChatId(AGENT_PERMANENT_ID),
                source: USER_CHAT_SOURCES.AGENT_GOAL,
                // Note: Goal chats are stored under the agent owner, not under the viewer
                userId: VIEWER_USER_ID + 1,
            }),
            { viewerUserId: VIEWER_USER_ID },
        );

        expect(summary.isAgentGoalChat).toBe(true);
        expect(summary.isReadOnly).toBe(true);
        expect(summary.isExternalUserChat).toBe(false);
    });

    it('keeps normal chats unflagged', () => {
        const summary = createUserChatSummaryFromSeed(createSeed({}), { viewerUserId: VIEWER_USER_ID });

        expect(summary.isAgentGoalChat).toBe(false);
        expect(summary.isReadOnly).toBe(false);
    });

    it('still marks other users’ normal chats as external', () => {
        const summary = createUserChatSummaryFromSeed(createSeed({ userId: VIEWER_USER_ID + 1 }), {
            viewerUserId: VIEWER_USER_ID,
        });

        expect(summary.isExternalUserChat).toBe(true);
        expect(summary.isReadOnly).toBe(true);
        expect(summary.userId).toBe(VIEWER_USER_ID + 1);
    });
});
