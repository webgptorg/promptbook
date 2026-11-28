import type { UserChatSummary } from '../../utils/userChatClient';
import { createMyChatsMobileMenuItem } from './createMyChatsMobileMenuItem';

/**
 * Stable timestamp used in lightweight mobile-menu regression fixtures.
 */
const FIXTURE_TIMESTAMP = '2026-04-01T00:00:00.000Z';

/**
 * Factory for one minimal user-chat summary fixture.
 */
function createChatFixture(chatId: string, title: string): UserChatSummary {
    return {
        id: chatId,
        createdAt: FIXTURE_TIMESTAMP,
        updatedAt: FIXTURE_TIMESTAMP,
        lastMessageAt: FIXTURE_TIMESTAMP,
        source: 'WEB_UI',
        isReadOnly: false,
        messagesCount: 1,
        title,
        preview: '',
        runningActivity: {
            count: 0,
        },
        timeoutActivity: {
            count: 0,
            nearestDueAt: null,
        },
    };
}

describe('createMyChatsMobileMenuItem', () => {
    it('exposes href navigation while preserving optional selection/create callbacks', () => {
        const onSelectChat = jest.fn();
        const onCreateChat = jest.fn();
        const menuItem = createMyChatsMobileMenuItem({
            formatText: (text) => text,
            chats: [createChatFixture('chat-1', 'Alpha chat')],
            resolveChatHref: (chatId) => `/agents/demo/chat?chat=${chatId}`,
            onSelectChat,
            newChatHref: '/agents/demo/chat?chat=new',
            onCreateChat,
        });

        const items = menuItem.items || [];
        const newChatItem = items[0];
        const firstChatItem = items[1];

        expect(newChatItem).toMatchObject({
            label: 'New chat',
            href: '/agents/demo/chat?chat=new',
        });
        expect(newChatItem?.onClick).toBe(onCreateChat);

        expect(firstChatItem).toMatchObject({
            label: 'Alpha chat',
            href: '/agents/demo/chat?chat=chat-1',
        });
        firstChatItem?.onClick?.();
        expect(onSelectChat).toHaveBeenCalledWith('chat-1');
    });

    it('keeps action-only chat rows when no href resolver is provided', () => {
        const onSelectChat = jest.fn();
        const menuItem = createMyChatsMobileMenuItem({
            formatText: (text) => text,
            chats: [createChatFixture('chat-2', 'Bravo chat')],
            onSelectChat,
        });

        const items = menuItem.items || [];
        const firstChatItem = items[0];

        expect(firstChatItem?.href).toBeUndefined();
        firstChatItem?.onClick?.();
        expect(onSelectChat).toHaveBeenCalledWith('chat-2');
    });
});
