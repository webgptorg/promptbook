'use client';

import { useState } from 'react';
import { getUserChatSourceChipLabel } from '../../../../utils/userChat/UserChatSource';
import type { UserChatSummary } from '../../../../utils/userChatClient';
import { formatChatTimeoutRemainingTime } from './formatChatTimeoutRemainingTime';

/**
 * Maximum number of messages a chat can have to be considered "empty" (just the initial greeting).
 *
 * @private function of AgentChatSidebar
 */
const EMPTY_CHAT_MAX_MESSAGES = 1;

/**
 * Lightweight status indicator rendered in the same reserved slot for every chat row.
 *
 * @private function of AgentChatSidebar
 */
export type AgentChatSidebarActivityState = {
    readonly kind: 'none' | 'running' | 'scheduled';
    readonly compactLabel: string | null;
    readonly statusLabel: string | null;
};

/**
 * Shared chat-item display fields consumed by both sidebar layouts.
 *
 * @private function of AgentChatSidebar
 */
export type AgentChatSidebarItemContent = {
    /**
     * Primary title of the chat entry.
     */
    readonly title: string;
    /**
     * Secondary preview text from the latest message.
     */
    readonly preview: string;
    /**
     * Human-friendly timestamp shown next to the chat.
     */
    readonly lastActivity: string;
    /**
     * Number of messages currently stored in this chat.
     */
    readonly messagesCount: number;
    /**
     * Human-friendly message-count label.
     */
    readonly messagesCountLabel: string;
    readonly activityIndicator: AgentChatSidebarActivityState;
    /**
     * Compact label that marks external frozen chats.
     */
    readonly sourceChipLabel: string | null;
    /**
     * Fully descriptive label exposed through title/ARIA attributes.
     */
    readonly accessibilityLabel: string;
};

/**
 * Reusable item model rendered by each sidebar layout.
 *
 * @private function of AgentChatSidebar
 */
export type AgentChatSidebarItem = {
    readonly id: string;
    readonly isActive: boolean;
    readonly isEmpty: boolean;
    readonly isReadOnly: boolean;
    readonly content: AgentChatSidebarItemContent;
};

/**
 * Options consumed by `useAgentChatSidebarState`.
 *
 * @private function of AgentChatSidebar
 */
type UseAgentChatSidebarStateOptions = {
    readonly chats: ReadonlyArray<UserChatSummary>;
    readonly activeChatId: string | null;
    readonly formatText: (text: string) => string;
    readonly formatChatTimestamp: (timestamp: string) => string;
    readonly currentTimestamp: number;
    readonly onSelectChat: (chatId: string) => void;
    readonly onDeleteChat: (chatId: string) => void;
    readonly isAdmin: boolean;
    readonly isShowingExternalChats: boolean;
    readonly onShowExternalChatsChange: (showExternalChats: boolean) => void;
    readonly isMobileSidebarOpen: boolean;
    readonly onCloseMobileSidebar: () => void;
};

/**
 * Resolved state and actions used by the sidebar layouts.
 *
 * @private function of AgentChatSidebar
 */
type UseAgentChatSidebarStateResult = {
    readonly sidebarItems: ReadonlyArray<AgentChatSidebarItem>;
    readonly emptyChatCount: number;
    readonly shouldRenderFilters: boolean;
    readonly isShowingEmptyChats: boolean;
    readonly toggleEmptyChatVisibility: () => void;
    readonly toggleExternalChatVisibility: () => void;
    readonly handleChatSelection: (chatId: string) => void;
    readonly handleNewChatLinkClick: () => void;
    readonly handleChatDelete: (chatId: string) => void;
};

/**
 * Formats message count for compact chat labels.
 *
 * @private function of AgentChatSidebar
 */
function formatChatMessagesCount(messagesCount: number, formatText: (text: string) => string): string {
    if (messagesCount === 1) {
        return `1 ${formatText('message')}`;
    }

    return `${messagesCount} ${formatText('messages')}`;
}

/**
 * Formats active running count for compact sidebar descriptions.
 *
 * @private function of AgentChatSidebar
 */
function formatRunningActivityCount(count: number, formatText: (text: string) => string): string {
    if (count === 1) {
        return `1 ${formatText('response in progress')}`;
    }

    return `${count} ${formatText('responses in progress')}`;
}

/**
 * Formats scheduled wake-up count for compact sidebar descriptions.
 *
 * @private function of AgentChatSidebar
 */
function formatScheduledWakeUpCount(count: number, formatText: (text: string) => string): string {
    if (count === 1) {
        return `1 ${formatText('scheduled wake-up')}`;
    }

    return `${count} ${formatText('scheduled wake-ups')}`;
}

/**
 * Resolves the single visible activity indicator for one chat.
 *
 * @private function of AgentChatSidebar
 */
function resolveAgentChatSidebarActivityState(
    chat: UserChatSummary,
    formatText: (text: string) => string,
    currentTimestamp: number,
): AgentChatSidebarActivityState {
    const scheduledLabel =
        chat.timeoutActivity.count > 0 && chat.timeoutActivity.nearestDueAt
            ? formatChatTimeoutRemainingTime(chat.timeoutActivity.nearestDueAt, currentTimestamp)
            : null;

    if (chat.runningActivity.count > 0) {
        return {
            kind: 'running',
            compactLabel: formatText('Running'),
            statusLabel: formatRunningActivityCount(chat.runningActivity.count, formatText),
        };
    }

    if (chat.timeoutActivity.count > 0) {
        const scheduledCountLabel = formatScheduledWakeUpCount(chat.timeoutActivity.count, formatText);

        return {
            kind: 'scheduled',
            compactLabel: scheduledLabel || formatText('Scheduled'),
            statusLabel:
                scheduledLabel === null
                    ? scheduledCountLabel
                    : `${scheduledCountLabel}, ${formatText('next wake-up in')} ${scheduledLabel}`,
        };
    }

    return {
        kind: 'none',
        compactLabel: null,
        statusLabel: null,
    };
}

/**
 * Resolves one chat summary into reusable display content for sidebar entries.
 *
 * @private function of AgentChatSidebar
 */
function resolveAgentChatSidebarItemContent(
    chat: UserChatSummary,
    formatText: (text: string) => string,
    formatChatTimestamp: (timestamp: string) => string,
    currentTimestamp: number,
): AgentChatSidebarItemContent {
    const title = chat.title || formatText('New chat');
    const preview = chat.preview || formatText('No messages yet');
    const lastActivity = formatChatTimestamp(chat.lastMessageAt || chat.updatedAt);
    const messagesCountLabel = formatChatMessagesCount(chat.messagesCount, formatText);
    const titleWithPreview = chat.preview ? `${title} - ${preview}` : title;
    const activityIndicator = resolveAgentChatSidebarActivityState(chat, formatText, currentTimestamp);
    const sourceChipLabel = getUserChatSourceChipLabel(chat.source);

    return {
        title,
        preview,
        lastActivity,
        messagesCount: chat.messagesCount,
        messagesCountLabel,
        activityIndicator,
        sourceChipLabel,
        accessibilityLabel: `${titleWithPreview} (${messagesCountLabel}, ${lastActivity}${
            activityIndicator.statusLabel ? `, ${activityIndicator.statusLabel}` : ''
        })`,
    };
}

/**
 * Closes the mobile sidebar after an action that should dismiss the overlay.
 *
 * @private function of AgentChatSidebar
 */
function closeMobileSidebarWhenOpen(isMobileSidebarOpen: boolean, onCloseMobileSidebar: () => void): void {
    if (isMobileSidebarOpen) {
        onCloseMobileSidebar();
    }
}

/**
 * Builds the shared sidebar item state and action handlers used by each layout variant.
 *
 * @private function of AgentChatSidebar
 */
export function useAgentChatSidebarState({
    chats,
    activeChatId,
    formatText,
    formatChatTimestamp,
    currentTimestamp,
    onSelectChat,
    onDeleteChat,
    isAdmin,
    isShowingExternalChats,
    onShowExternalChatsChange,
    isMobileSidebarOpen,
    onCloseMobileSidebar,
}: UseAgentChatSidebarStateOptions): UseAgentChatSidebarStateResult {
    const [isShowingEmptyChats, setIsShowingEmptyChats] = useState(true);

    const allSidebarItems = chats.map((chat) => ({
        id: chat.id,
        isActive: chat.id === activeChatId,
        isEmpty: chat.messagesCount <= EMPTY_CHAT_MAX_MESSAGES,
        isReadOnly: chat.isReadOnly,
        content: resolveAgentChatSidebarItemContent(chat, formatText, formatChatTimestamp, currentTimestamp),
    }));
    const emptyChatCount = allSidebarItems.filter((item) => item.isEmpty).length;
    const sidebarItems = allSidebarItems.filter((item) => isShowingEmptyChats || !item.isEmpty || item.isActive);
    const shouldRenderFilters = emptyChatCount > 0 || isAdmin;

    const handleChatSelection = (chatId: string) => {
        onSelectChat(chatId);
        closeMobileSidebarWhenOpen(isMobileSidebarOpen, onCloseMobileSidebar);
    };

    const handleNewChatLinkClick = () => {
        closeMobileSidebarWhenOpen(isMobileSidebarOpen, onCloseMobileSidebar);
    };

    const handleChatDelete = (chatId: string) => {
        onDeleteChat(chatId);
        closeMobileSidebarWhenOpen(isMobileSidebarOpen, onCloseMobileSidebar);
    };

    const toggleEmptyChatVisibility = () => {
        setIsShowingEmptyChats((isShowingEmptyChats) => !isShowingEmptyChats);
    };

    const toggleExternalChatVisibility = () => {
        onShowExternalChatsChange(!isShowingExternalChats);
    };

    return {
        sidebarItems,
        emptyChatCount,
        shouldRenderFilters,
        isShowingEmptyChats,
        toggleEmptyChatVisibility,
        toggleExternalChatVisibility,
        handleChatSelection,
        handleNewChatLinkClick,
        handleChatDelete,
    };
}
