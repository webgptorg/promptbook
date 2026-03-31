import { getUserChatSourceChipLabel } from '../../../../utils/userChat/UserChatSource';
import type { UserChatSummary } from '../../../../utils/userChatClient';
import { formatChatTimeoutRemainingTime } from './formatChatTimeoutRemainingTime';

/**
 * Lightweight activity state displayed alongside a chat entry.
 */
export type UserChatMenuItemActivityIndicator = {
    readonly kind: 'none' | 'running' | 'scheduled';
    readonly compactLabel: string | null;
    readonly statusLabel: string | null;
};

/**
 * Shared display fields reused by chat list surfaces.
 */
export type UserChatMenuItemContent = {
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
    /**
     * Single visible activity indicator.
     */
    readonly activityIndicator: UserChatMenuItemActivityIndicator;
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
 * Formats message count for compact chat labels.
 *
 * @param messagesCount - Number of messages stored in the chat.
 * @param formatText - Route-local localization helper.
 * @returns Human-readable message-count label.
 */
function formatChatMessagesCount(messagesCount: number, formatText: (text: string) => string): string {
    if (messagesCount === 1) {
        return `1 ${formatText('message')}`;
    }

    return `${messagesCount} ${formatText('messages')}`;
}

/**
 * Formats active running count for compact chat descriptions.
 *
 * @param count - Number of running tasks.
 * @param formatText - Route-local localization helper.
 * @returns Compact running-activity label.
 */
function formatRunningActivityCount(count: number, formatText: (text: string) => string): string {
    if (count === 1) {
        return `1 ${formatText('response in progress')}`;
    }

    return `${count} ${formatText('responses in progress')}`;
}

/**
 * Formats scheduled wake-up count for compact chat descriptions.
 *
 * @param count - Number of scheduled wake-ups.
 * @param formatText - Route-local localization helper.
 * @returns Compact scheduled-activity label.
 */
function formatScheduledWakeUpCount(count: number, formatText: (text: string) => string): string {
    if (count === 1) {
        return `1 ${formatText('scheduled wake-up')}`;
    }

    return `${count} ${formatText('scheduled wake-ups')}`;
}

/**
 * Resolves the single visible activity indicator for one chat row.
 *
 * @param chat - Chat summary rendered in the list.
 * @param formatText - Route-local localization helper.
 * @param currentTimestamp - Current timestamp used for live timeout countdowns.
 * @returns Compact activity indicator metadata.
 */
function resolveUserChatMenuItemActivityIndicator(
    chat: UserChatSummary,
    formatText: (text: string) => string,
    currentTimestamp: number,
): UserChatMenuItemActivityIndicator {
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
 * Resolves one chat summary into reusable display content for mobile drawers and sidebars.
 *
 * @param chat - Chat summary rendered in the list.
 * @param formatText - Route-local localization helper.
 * @param formatChatTimestamp - Formatter shared by the calling surface.
 * @param currentTimestamp - Current timestamp used for live timeout countdowns.
 * @returns Shared display fields for one chat entry.
 */
export function resolveUserChatMenuItemContent(
    chat: UserChatSummary,
    formatText: (text: string) => string,
    formatChatTimestamp: (timestamp: string) => string,
    currentTimestamp: number,
): UserChatMenuItemContent {
    const title = chat.title || formatText('New chat');
    const preview = chat.preview || formatText('No messages yet');
    const lastActivity = formatChatTimestamp(chat.lastMessageAt || chat.updatedAt);
    const messagesCountLabel = formatChatMessagesCount(chat.messagesCount, formatText);
    const titleWithPreview = chat.preview ? `${title} - ${preview}` : title;
    const activityIndicator = resolveUserChatMenuItemActivityIndicator(chat, formatText, currentTimestamp);
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
