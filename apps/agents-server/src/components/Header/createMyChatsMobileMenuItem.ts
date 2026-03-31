import { MessageSquareIcon, MessageSquarePlusIcon } from 'lucide-react';
import type { UserChatSummary } from '../../utils/userChatClient';
import type { SubMenuItem } from './SubMenuItem';

/**
 * Maximum number of chat rows rendered in the hoisted mobile menu section.
 *
 * @private internal constant of mobile header navigation
 */
const MAX_VISIBLE_HOISTED_CHATS = 12;

/**
 * Parameters for generating the shared "My chats" mobile menu node.
 *
 * @private internal utility options of mobile header navigation
 */
type CreateMyChatsMobileMenuItemOptions = {
    /**
     * Localization formatter from the current language context.
     */
    readonly formatText: (text: string) => string;
    /**
     * Chats available for the current agent and user.
     */
    readonly chats: ReadonlyArray<UserChatSummary>;
    /**
     * Active chat id, used to emphasize the selected row.
     */
    readonly activeChatId?: string | null;
    /**
     * Opens the selected chat in the current page state.
     */
    readonly onSelectChat: (chatId: string) => void;
    /**
     * Optional action that creates a fresh chat thread.
     */
    readonly onCreateChat?: () => void;
};

/**
 * Resolves a compact, stable label for one chat row in the mobile menu.
 *
 * @private helper of `createMyChatsMobileMenuItem`
 */
function resolveMyChatsItemLabel(
    chat: UserChatSummary,
    formatText: (text: string) => string,
    activeChatId: string | null,
): string {
    const chatTitle = chat.title || formatText('New chat');
    return chat.id === activeChatId ? `${chatTitle} (${formatText('Current')})` : chatTitle;
}

/**
 * Creates one nested "My chats" node that can be hoisted into the shared mobile drawer.
 *
 * @private internal utility of Agents Server mobile navigation
 */
export function createMyChatsMobileMenuItem(options: CreateMyChatsMobileMenuItemOptions): SubMenuItem {
    const visibleChats = options.chats.slice(0, MAX_VISIBLE_HOISTED_CHATS);
    const hasTruncatedChats = options.chats.length > visibleChats.length;
    const hiddenChatsCount = options.chats.length - visibleChats.length;

    const chatItems: Array<SubMenuItem> = visibleChats.map((chat) => ({
        label: resolveMyChatsItemLabel(chat, options.formatText, options.activeChatId || null),
        icon: MessageSquareIcon,
        isBold: chat.id === options.activeChatId,
        onClick: () => {
            options.onSelectChat(chat.id);
        },
    }));

    const items: Array<SubMenuItem> = [];

    if (options.onCreateChat) {
        items.push({
            label: options.formatText('New chat'),
            icon: MessageSquarePlusIcon,
            isBold: true,
            isBordered: chatItems.length > 0,
            onClick: options.onCreateChat,
        });
    }

    if (chatItems.length > 0) {
        items.push(...chatItems);
    } else {
        items.push({
            label: options.formatText('No chats yet'),
            icon: MessageSquareIcon,
        });
    }

    if (hasTruncatedChats) {
        items.push({
            label: `${options.formatText('More chats')}: +${hiddenChatsCount}`,
            icon: MessageSquareIcon,
        });
    }

    return {
        label: options.formatText('My chats'),
        icon: MessageSquareIcon,
        isBold: true,
        items,
    };
}
