import { isUserPushSubscriptionFocusedOnChat } from './sendUserChatPushNotification';

describe('isUserPushSubscriptionFocusedOnChat', () => {
    const nowIso = '2026-03-19T12:00:00.000Z';
    const nowTimestamp = new Date(nowIso).getTime();

    it('returns true for a fresh heartbeat on the same chat', () => {
        expect(
            isUserPushSubscriptionFocusedOnChat(
                {
                    isChatFocused: true,
                    focusedAgentPermanentId: 'agent-1',
                    focusedChatId: 'chat-1',
                    focusUpdatedAt: '2026-03-19T11:59:30.000Z',
                },
                {
                    agentPermanentId: 'agent-1',
                    id: 'chat-1',
                },
                nowTimestamp,
            ),
        ).toBe(true);
    });

    it('returns false for stale focus heartbeats', () => {
        expect(
            isUserPushSubscriptionFocusedOnChat(
                {
                    isChatFocused: true,
                    focusedAgentPermanentId: 'agent-1',
                    focusedChatId: 'chat-1',
                    focusUpdatedAt: '2026-03-19T11:58:00.000Z',
                },
                {
                    agentPermanentId: 'agent-1',
                    id: 'chat-1',
                },
                nowTimestamp,
            ),
        ).toBe(false);
    });

    it('returns false for a different chat', () => {
        expect(
            isUserPushSubscriptionFocusedOnChat(
                {
                    isChatFocused: true,
                    focusedAgentPermanentId: 'agent-1',
                    focusedChatId: 'chat-2',
                    focusUpdatedAt: '2026-03-19T11:59:30.000Z',
                },
                {
                    agentPermanentId: 'agent-1',
                    id: 'chat-1',
                },
                nowTimestamp,
            ),
        ).toBe(false);
    });
});
