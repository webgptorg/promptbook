import { describe, expect, it, jest } from '@jest/globals';
import { getUserChat } from './getUserChat';
import { getUserChatForJobRunner } from './getUserChatForJobRunner';
import { provideUserChatTable } from './provideUserChatTable';
import { USER_CHAT_SOURCES } from './UserChatSource';

jest.mock('./provideUserChatTable', () => ({
    provideUserChatTable: jest.fn(),
}));

const provideUserChatTableMock = provideUserChatTable as jest.MockedFunction<typeof provideUserChatTable>;

const JOB = {
    userId: 42,
    agentPermanentId: 'muKfAxFcHQZrNA',
    chatId: 'email-f5598a05bff7b2500e0dff21d10c',
};

/**
 * Serves one stored chat row through the minimal Supabase query surface `getUserChat` uses.
 */
function mockStoredUserChatRow(source: string): void {
    provideUserChatTableMock.mockReturnValue({
        select: () => ({
            eq: () => ({
                eq: () => ({
                    maybeSingle: async () => ({
                        data: {
                            id: JOB.chatId,
                            createdAt: '2026-08-08T00:00:00.000Z',
                            updatedAt: '2026-08-08T00:00:00.000Z',
                            lastMessageAt: null,
                            title: 'Email conversation',
                            userId: JOB.userId,
                            agentPermanentId: JOB.agentPermanentId,
                            source,
                            messages: [],
                            draftMessage: null,
                        },
                        error: null,
                    }),
                }),
            }),
        }),
    } as unknown as Awaited<ReturnType<typeof provideUserChatTable>>);
}

describe('getUserChatForJobRunner', () => {
    it('loads an email chat which the viewer-facing lookup hides from non-administrators', async () => {
        mockStoredUserChatRow(USER_CHAT_SOURCES.EMAIL);

        // Note: This is the regression which left every inbound email unanswered - the runner saw no chat
        //       and cancelled its own job as if the conversation had been deleted
        expect(
            await getUserChat({
                userId: JOB.userId,
                agentPermanentId: JOB.agentPermanentId,
                chatId: JOB.chatId,
            }),
        ).toBeNull();

        const chat = await getUserChatForJobRunner(JOB);

        expect(chat?.id).toBe(JOB.chatId);
        expect(chat?.source).toBe(USER_CHAT_SOURCES.EMAIL);
    });

    it('still loads the ordinary web chats of the job owner', async () => {
        mockStoredUserChatRow(USER_CHAT_SOURCES.WEB_UI);

        expect((await getUserChatForJobRunner(JOB))?.source).toBe(USER_CHAT_SOURCES.WEB_UI);
    });
});
