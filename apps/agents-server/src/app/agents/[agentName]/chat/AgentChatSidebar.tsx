'use client';

import { Clock3Icon, EyeIcon, EyeOffIcon, Loader2Icon, MessageSquarePlusIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { SolidArrowButton } from '../../../../../../../src/book-components/icons/SolidArrowButton';
import { ChatListLoadingSkeleton } from '../../../../components/Skeleton/ChatListLoadingSkeleton';
import { getUserChatSourceChipLabel } from '../../../../utils/userChat/UserChatSource';
import type { UserChatSummary } from '../../../../utils/userChatClient';
import type { AgentChatLayoutVariant } from './AgentChatLayoutVariant';
import { formatChatTimeoutRemainingTime } from './formatChatTimeoutRemainingTime';

/**
 * Maximum number of messages a chat can have to be considered "empty" (just the initial greeting).
 *
 * @private internal constant of `<AgentChatSidebar/>`
 */
const EMPTY_CHAT_MAX_MESSAGES = 1;

/**
 * HTML ID assigned to the chat sidebar so controls can reference the panel without hardcoding strings.
 *
 * @public exported from `apps/agents-server`
 */
export const AGENT_CHAT_SIDEBAR_ID = 'agent-chat-sidebar';

/**
 * Properties for the chat sidebar responsible for listing user conversations.
 */
type AgentChatSidebarProps = {
    /**
     * List of available chats for the current agent.
     */
    readonly chats: ReadonlyArray<UserChatSummary>;
    /**
     * Identifier of the currently selected chat.
     */
    readonly activeChatId: string | null;
    /**
     * Flag that indicates whether the server is creating a new chat.
     */
    readonly isCreatingChat: boolean;
    /**
     * Flag indicating that chat summaries are still loading/refetching.
     */
    readonly isLoadingChats: boolean;
    /**
     * Formatter for localized labels.
     */
    readonly formatText: (text: string) => string;
    /**
     * Timestamp formatter shared with the parent component.
     */
    readonly formatChatTimestamp: (timestamp: string) => string;
    /**
     * Current timestamp used for rendering live timeout countdowns.
     */
    readonly currentTimestamp: number;
    /**
     * Called when the user selects a chat from the list.
     */
    readonly onSelectChat: (chatId: string) => void;
    /**
     * Called when a new chat should be created.
     */
    readonly onCreateChat: () => void;
    /**
     * Called when a chat should be deleted.
     */
    readonly onDeleteChat: (chatId: string) => void;
    /**
     * Whether the current viewer can see admin-only chat filters.
     */
    readonly isAdmin: boolean;
    /**
     * Whether frozen external chats are included in the current list.
     */
    readonly showExternalChats: boolean;
    /**
     * Toggles admin-only frozen external chat visibility.
     */
    readonly onShowExternalChatsChange: (showExternalChats: boolean) => void;
    /**
     * Controls whether the desktop sidebar is collapsed into a slim strip.
     */
    readonly isCollapsed: boolean;
    /**
     * Toggles the collapsed state of the sidebar.
     */
    readonly onToggleCollapse: () => void;
    /**
     * Visual sidebar variant used by the current route.
     */
    readonly variant?: AgentChatLayoutVariant;
};

/**
 * Shared chat-item display fields consumed by both sidebar layouts.
 */
type SidebarChatItemContent = {
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
    readonly activityIndicator: SidebarChatActivityIndicator;
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
 * Lightweight status indicator rendered in the same reserved slot for every chat row.
 */
type SidebarChatActivityIndicator = {
    readonly kind: 'none' | 'running' | 'scheduled';
    readonly compactLabel: string | null;
    readonly statusLabel: string | null;
};

/**
 * One fully resolved chat row consumed by sidebar and mobile-menu renderers.
 */
type ResolvedSidebarChatItem = {
    readonly chat: UserChatSummary;
    readonly isActive: boolean;
    readonly isEmpty: boolean;
    readonly isReadOnly: boolean;
    readonly content: SidebarChatItemContent;
};

/**
 * Formats message count for compact chat labels.
 */
function formatChatMessagesCount(messagesCount: number, formatText: (text: string) => string): string {
    if (messagesCount === 1) {
        return `1 ${formatText('message')}`;
    }

    return `${messagesCount} ${formatText('messages')}`;
}

/**
 * Formats active running count for compact sidebar descriptions.
 */
function formatRunningActivityCount(count: number, formatText: (text: string) => string): string {
    if (count === 1) {
        return `1 ${formatText('response in progress')}`;
    }

    return `${count} ${formatText('responses in progress')}`;
}

/**
 * Formats scheduled wake-up count for compact sidebar descriptions.
 */
function formatScheduledWakeUpCount(count: number, formatText: (text: string) => string): string {
    if (count === 1) {
        return `1 ${formatText('scheduled wake-up')}`;
    }

    return `${count} ${formatText('scheduled wake-ups')}`;
}

/**
 * Resolves the single visible activity indicator for one chat.
 */
function resolveSidebarChatActivityIndicator(
    chat: UserChatSummary,
    formatText: (text: string) => string,
    currentTimestamp: number,
): SidebarChatActivityIndicator {
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
 * Renders one running/scheduled activity icon while reserving layout space when absent.
 */
function ChatSidebarActivityIndicator({
    indicator,
}: {
    indicator: SidebarChatActivityIndicator;
}) {
    const baseClasses =
        'inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/90 shadow-sm ring-1 ring-slate-200/90';

    if (indicator.kind === 'running') {
        return (
            <span
                role="img"
                aria-label={indicator.statusLabel || undefined}
                title={indicator.statusLabel || undefined}
                className={`${baseClasses} text-blue-600 ring-blue-200/90`}
            >
                <Loader2Icon className="h-2.5 w-2.5 animate-spin" />
            </span>
        );
    }

    if (indicator.kind === 'scheduled') {
        return (
            <span
                role="img"
                aria-label={indicator.statusLabel || undefined}
                title={indicator.statusLabel || undefined}
                className={`${baseClasses} text-amber-700 ring-amber-200/90`}
            >
                <Clock3Icon className="h-2.5 w-2.5" />
            </span>
        );
    }

    return (
        <span aria-hidden="true" className={`${baseClasses} invisible`}>
            <Clock3Icon className="h-2.5 w-2.5" />
        </span>
    );
}

/**
 * Resolves one chat summary into reusable display content for sidebar entries.
 */
function resolveSidebarChatItemContent(
    chat: UserChatSummary,
    formatText: (text: string) => string,
    formatChatTimestamp: (timestamp: string) => string,
    currentTimestamp: number,
): SidebarChatItemContent {
    const title = chat.title || formatText('New chat');
    const preview = chat.preview || formatText('No messages yet');
    const lastActivity = formatChatTimestamp(chat.lastMessageAt || chat.updatedAt);
    const messagesCountLabel = formatChatMessagesCount(chat.messagesCount, formatText);
    const titleWithPreview = chat.preview ? `${title} - ${preview}` : title;
    const activityIndicator = resolveSidebarChatActivityIndicator(chat, formatText, currentTimestamp);
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
 * Resolves visible chat rows and shared filter state for sidebar-like chat menus.
 */
function resolveVisibleSidebarItems(options: {
    readonly chats: ReadonlyArray<UserChatSummary>;
    readonly activeChatId: string | null;
    readonly showEmptyChats: boolean;
    readonly isAdmin: boolean;
    readonly formatText: (text: string) => string;
    readonly formatChatTimestamp: (timestamp: string) => string;
    readonly currentTimestamp: number;
}): {
    readonly sidebarItems: Array<ResolvedSidebarChatItem>;
    readonly emptyChatCount: number;
    readonly shouldRenderFilters: boolean;
} {
    const allSidebarItems = options.chats.map((chat) => ({
        chat,
        isActive: chat.id === options.activeChatId,
        isEmpty: chat.messagesCount <= EMPTY_CHAT_MAX_MESSAGES,
        isReadOnly: chat.isReadOnly,
        content: resolveSidebarChatItemContent(
            chat,
            options.formatText,
            options.formatChatTimestamp,
            options.currentTimestamp,
        ),
    }));
    const emptyChatCount = allSidebarItems.filter((item) => item.isEmpty).length;

    return {
        sidebarItems: allSidebarItems.filter((item) => options.showEmptyChats || !item.isEmpty || item.isActive),
        emptyChatCount,
        shouldRenderFilters: emptyChatCount > 0 || options.isAdmin,
    };
}

/**
 * Props for rendering the hoisted mobile chat-menu section inside the header drawer.
 */
type AgentChatMobileMenuSectionProps = Pick<
    AgentChatSidebarProps,
    | 'chats'
    | 'activeChatId'
    | 'isCreatingChat'
    | 'isLoadingChats'
    | 'formatText'
    | 'formatChatTimestamp'
    | 'currentTimestamp'
    | 'onSelectChat'
    | 'onCreateChat'
    | 'onDeleteChat'
    | 'isAdmin'
    | 'showExternalChats'
    | 'onShowExternalChatsChange'
> & {
    /**
     * Closes the shared mobile menu after navigation-style actions.
     */
    readonly onNavigate: () => void;
};

/**
 * Renders the chat list inside the unified mobile header menu.
 *
 * @private Agents Server presentation logic for mobile chat navigation.
 */
export function AgentChatMobileMenuSection({
    chats,
    activeChatId,
    isCreatingChat,
    isLoadingChats,
    formatText,
    formatChatTimestamp,
    currentTimestamp,
    onSelectChat,
    onCreateChat,
    onDeleteChat,
    isAdmin,
    showExternalChats,
    onShowExternalChatsChange,
    onNavigate,
}: AgentChatMobileMenuSectionProps) {
    const [showEmptyChats, setShowEmptyChats] = useState(true);
    const emptyStateText = formatText('No chats yet');
    const { sidebarItems, emptyChatCount, shouldRenderFilters } = resolveVisibleSidebarItems({
        chats,
        activeChatId,
        showEmptyChats,
        isAdmin,
        formatText,
        formatChatTimestamp,
        currentTimestamp,
    });

    return (
        <div className="flex flex-col gap-3">
            <button
                type="button"
                onClick={() => {
                    onCreateChat();
                    onNavigate();
                }}
                disabled={isCreatingChat || isLoadingChats}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-default disabled:opacity-60"
            >
                <MessageSquarePlusIcon className="h-4 w-4" />
                {isCreatingChat ? formatText('Creating...') : formatText('New chat')}
            </button>

            {isLoadingChats ? (
                <ChatListLoadingSkeleton rowCount={5} />
            ) : (
                <div className="flex max-h-[45vh] flex-col gap-2 overflow-y-auto pr-1">
                    {sidebarItems.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-slate-200 bg-white/80 px-3 py-4 text-center text-sm text-slate-500">
                            {emptyStateText}
                        </p>
                    ) : (
                        sidebarItems.map(({ chat, content, isActive, isEmpty, isReadOnly }) => (
                            <div
                                key={chat.id}
                                className={`group relative rounded-xl border ${
                                    isActive
                                        ? 'border-blue-300 bg-blue-50 shadow-sm'
                                        : 'border-transparent bg-white/90 hover:border-slate-200 hover:bg-white'
                                } ${isEmpty && !isActive ? 'opacity-45' : ''}`}
                            >
                                <span className="absolute left-3 top-3.5 z-[5]">
                                    <ChatSidebarActivityIndicator indicator={content.activityIndicator} />
                                </span>
                                <button
                                    type="button"
                                    className="w-full text-left px-3 py-3 pl-10 pr-10"
                                    onClick={() => {
                                        onSelectChat(chat.id);
                                        onNavigate();
                                    }}
                                    aria-label={content.accessibilityLabel}
                                    title={content.accessibilityLabel}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                                            {content.title}
                                        </div>
                                        {content.sourceChipLabel && (
                                            <span className="inline-flex flex-shrink-0 items-center rounded-full bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                                                {content.sourceChipLabel}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-1 truncate text-xs text-slate-500">{content.preview}</div>
                                    <div className="mt-2 flex items-center justify-between gap-2">
                                        <div
                                            className={`truncate text-[11px] ${
                                                content.activityIndicator.kind === 'scheduled'
                                                    ? 'font-semibold text-amber-700'
                                                    : content.activityIndicator.kind === 'running'
                                                      ? 'font-semibold text-blue-700'
                                                      : 'text-slate-400'
                                            }`}
                                        >
                                            {content.activityIndicator.compactLabel || content.lastActivity}
                                        </div>
                                    </div>
                                </button>
                                {!isReadOnly && (
                                    <button
                                        type="button"
                                        className="absolute right-2 top-2 rounded-md p-1.5 text-slate-400 opacity-100 transition hover:bg-white/90 hover:text-red-600 focus-visible:outline focus-visible:outline-blue-400 focus-visible:outline-offset-2"
                                        onClick={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            void onDeleteChat(chat.id);
                                            onNavigate();
                                        }}
                                        title={formatText('Delete chat')}
                                    >
                                        <Trash2Icon className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {shouldRenderFilters && !isLoadingChats && (
                <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-2">
                    <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {formatText('Filters')}
                    </div>
                    <div className="flex flex-col gap-1">
                        {emptyChatCount > 0 && (
                            <button
                                type="button"
                                onClick={() => setShowEmptyChats((previousValue) => !previousValue)}
                                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            >
                                {showEmptyChats ? (
                                    <>
                                        <EyeOffIcon className="h-3.5 w-3.5" />
                                        {formatText('Hide empty chats')}
                                    </>
                                ) : (
                                    <>
                                        <EyeIcon className="h-3.5 w-3.5" />
                                        {`${formatText('Show')} ${emptyChatCount} ${formatText('empty')}`}
                                    </>
                                )}
                            </button>
                        )}
                        {isAdmin && (
                            <button
                                type="button"
                                onClick={() => onShowExternalChatsChange(!showExternalChats)}
                                className={`w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition ${
                                    showExternalChats
                                        ? 'bg-slate-900 text-white'
                                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                                }`}
                            >
                                {showExternalChats
                                    ? formatText('Hide external chats')
                                    : formatText('Show external chats')}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Responsive sidebar that lists user chats and provides creation/deletion controls.
 *
 * @private Agents Server presentation logic for the agent chat experience.
 */
export function AgentChatSidebar({
    chats,
    activeChatId,
    isCreatingChat,
    isLoadingChats,
    formatText,
    formatChatTimestamp,
    currentTimestamp,
    onSelectChat,
    onCreateChat,
    onDeleteChat,
    isAdmin,
    showExternalChats,
    onShowExternalChatsChange,
    isCollapsed,
    onToggleCollapse,
    variant = 'default',
}: AgentChatSidebarProps) {
    const isChatGptLike = variant === 'chatgptLike';
    const shouldRenderCollapsed = isCollapsed;
    const widthClasses = isCollapsed ? 'md:w-20' : 'md:w-72';

    const handleChatChoose = (chatId: string) => {
        onSelectChat(chatId);
    };

    const handleCreateChat = () => {
        onCreateChat();
    };

    const [showEmptyChats, setShowEmptyChats] = useState(true);

    const emptyStateText = formatText('No chats yet');
    const sidebarToggleLabel = isCollapsed ? formatText('Expand sidebar') : formatText('Collapse sidebar');
    const { sidebarItems, emptyChatCount, shouldRenderFilters } = resolveVisibleSidebarItems({
        chats,
        activeChatId,
        showEmptyChats,
        isAdmin,
        formatText,
        formatChatTimestamp,
        currentTimestamp,
    });

    if (isChatGptLike) {
        return (
            <aside
                id={AGENT_CHAT_SIDEBAR_ID}
                className="agent-chat-chatgpt-like-sidebar hidden min-h-0 w-[17.25rem] flex-col md:flex"
            >
                <div className="agent-chat-chatgpt-like-sidebar__header flex items-center justify-between px-3.5 py-3">
                    <div className="min-w-0">
                        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-current/55">
                            {formatText('Current agent')}
                        </p>
                        <h2 className="truncate text-sm font-semibold text-current">{formatText('Chats')}</h2>
                    </div>
                </div>

                <div className="px-3 pb-3 pt-1.5">
                    <button
                        type="button"
                        onClick={handleCreateChat}
                        disabled={isCreatingChat || isLoadingChats}
                        className="agent-chat-chatgpt-like-new-chat inline-flex w-full items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition disabled:cursor-default disabled:opacity-60"
                    >
                        <MessageSquarePlusIcon className="h-4 w-4" />
                        {isCreatingChat ? formatText('Creating...') : formatText('New chat')}
                    </button>
                </div>

                {isLoadingChats ? (
                    <ChatListLoadingSkeleton rowCount={8} />
                ) : (
                    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-3 scrollbar-hidden">
                        {sidebarItems.length === 0 ? (
                            <p className="px-3 py-2 text-sm text-current/65">{emptyStateText}</p>
                        ) : (
                            sidebarItems.map(({ chat, content, isActive, isEmpty }) => {
                                const rowStatusClassName =
                                    content.activityIndicator.kind === 'running'
                                        ? 'text-emerald-400/90'
                                        : content.activityIndicator.kind === 'scheduled'
                                          ? 'text-amber-400/90'
                                          : 'text-current/55';

                                return (
                                    <div
                                        key={chat.id}
                                        className={`agent-chat-chatgpt-like-chat-row group relative rounded-xl ${
                                            isActive ? 'is-active' : ''
                                        } ${isEmpty && !isActive ? 'opacity-55' : ''}`}
                                    >
                                        <button
                                            type="button"
                                            className="agent-chat-chatgpt-like-chat-row__button w-full rounded-xl px-2.5 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                                            onClick={() => handleChatChoose(chat.id)}
                                            aria-label={content.accessibilityLabel}
                                            title={content.accessibilityLabel}
                                        >
                                            <div className="flex items-start gap-2.5">
                                                <div className="pt-0.5">
                                                    <ChatSidebarActivityIndicator indicator={content.activityIndicator} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="min-w-0 flex-1 truncate text-[13px] font-medium">
                                                            {content.title}
                                                        </div>
                                                        {content.sourceChipLabel && (
                                                            <span className="agent-chat-chatgpt-like-chat-row__chip inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
                                                                {content.sourceChipLabel}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="mt-1 truncate text-[11px] text-current/65">
                                                        {content.preview}
                                                    </div>
                                                    <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px]">
                                                        <span className={`truncate font-medium ${rowStatusClassName}`}>
                                                            {content.activityIndicator.compactLabel || content.lastActivity}
                                                        </span>
                                                        <span className="text-current/52">{content.messagesCountLabel}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>

                                        {!chat.isReadOnly && (
                                            <button
                                                type="button"
                                                className="agent-chat-chatgpt-like-chat-row__delete absolute right-1.5 top-1.5 rounded-md p-1.5 opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    onDeleteChat(chat.id);
                                                }}
                                                title={formatText('Delete chat')}
                                            >
                                                <Trash2Icon className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {shouldRenderFilters && !isLoadingChats && (
                    <div className="agent-chat-chatgpt-like-sidebar__footer px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                            {emptyChatCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setShowEmptyChats((previousValue) => !previousValue)}
                                    className="agent-chat-chatgpt-like-filter-button inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition"
                                >
                                    {showEmptyChats ? (
                                        <>
                                            <EyeOffIcon className="h-3.5 w-3.5" />
                                            {formatText('Hide empty')}
                                        </>
                                    ) : (
                                        <>
                                            <EyeIcon className="h-3.5 w-3.5" />
                                            {`${formatText('Show')} ${emptyChatCount}`}
                                        </>
                                    )}
                                </button>
                            )}
                            {isAdmin && (
                                <button
                                    type="button"
                                    onClick={() => onShowExternalChatsChange(!showExternalChats)}
                                    className={`agent-chat-chatgpt-like-filter-button inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                                        showExternalChats ? 'is-active' : ''
                                    }`}
                                >
                                    {showExternalChats
                                        ? formatText('External chats on')
                                        : formatText('External chats off')}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </aside>
        );
    }

    return (
        <aside
            id={AGENT_CHAT_SIDEBAR_ID}
            className={`relative hidden min-h-0 flex-col border-r border-slate-200 bg-white/90 backdrop-blur md:flex ${widthClasses}`}
        >
            <div className="hidden md:flex absolute inset-y-0 right-0 z-10 translate-x-1/2 items-center justify-center pointer-events-none">
                <SolidArrowButton
                    direction={isCollapsed ? 'right' : 'left'}
                    onClick={onToggleCollapse}
                    className="pointer-events-auto"
                    aria-controls={AGENT_CHAT_SIDEBAR_ID}
                    aria-expanded={!isCollapsed}
                    aria-label={sidebarToggleLabel}
                />
            </div>

            {shouldRenderCollapsed ? (
                <div className="flex min-h-0 flex-1 flex-col items-center gap-3 px-2 py-4">
                        <button
                            type="button"
                            onClick={handleCreateChat}
                            disabled={isCreatingChat || isLoadingChats}
                            className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60"
                            title={formatText('New chat')}
                        >
                            <MessageSquarePlusIcon className="h-5 w-5" />
                        </button>

                        {isLoadingChats ? (
                            <ChatListLoadingSkeleton isCollapsed rowCount={6} />
                        ) : (
                            <div className="flex min-h-0 w-full flex-1 flex-col gap-2 overflow-y-auto scrollbar-hidden">
                                {sidebarItems.length === 0 ? (
                                    <p className="px-1 text-center text-[11px] text-slate-500">{emptyStateText}</p>
                                ) : (
                                    sidebarItems.map(({ chat, content, isActive, isEmpty }) => {
                                        return (
                                            <button
                                                key={chat.id}
                                                type="button"
                                                onClick={() => handleChatChoose(chat.id)}
                                                className={`group relative flex w-full min-w-0 flex-col items-center gap-1 rounded-2xl border px-1.5 py-2 transition focus-visible:outline focus-visible:outline-blue-400 focus-visible:outline-offset-2 ${
                                                    isActive
                                                        ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-sm'
                                                        : 'border-transparent bg-slate-100/80 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                                                } ${isEmpty && !isActive ? 'opacity-40' : ''}`}
                                                aria-label={content.accessibilityLabel}
                                                title={content.accessibilityLabel}
                                            >
                                                <span className="absolute left-1.5 top-1.5 z-[5]">
                                                    <ChatSidebarActivityIndicator indicator={content.activityIndicator} />
                                                </span>
                                                {content.sourceChipLabel && (
                                                    <span className="absolute left-1.5 bottom-1.5 z-[5] inline-flex items-center rounded-full bg-slate-900/85 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.18em] text-white shadow-sm">
                                                        {content.sourceChipLabel}
                                                    </span>
                                                )}
                                                <span
                                                    className={`absolute top-0.5 right-0.5 z-[5] inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none shadow-sm ${
                                                        isActive ? 'bg-blue-500 text-white' : 'bg-slate-400 text-white'
                                                    }`}
                                                    aria-label={content.messagesCountLabel}
                                                >
                                                    {content.messagesCount}
                                                </span>
                                                <div
                                                    className={`w-full aspect-square overflow-hidden rounded-xl border px-1.5 py-1.5 text-left ${
                                                        isActive
                                                            ? 'border-blue-300 bg-white/90 text-blue-700'
                                                            : 'border-slate-200 bg-white/90 text-slate-600'
                                                    }`}
                                                >
                                                    <div className="max-w-full truncate text-[10px] font-semibold leading-none">
                                                        {content.title}
                                                    </div>
                                                    <div className="mt-1 max-w-full truncate text-[9px] leading-tight text-slate-500">
                                                        {content.preview}
                                                    </div>
                                                </div>
                                                <span
                                                    className={`max-w-full truncate text-[10px] font-semibold leading-none ${
                                                        content.activityIndicator.kind === 'scheduled'
                                                            ? 'text-amber-700'
                                                            : content.activityIndicator.kind === 'running' || isActive
                                                              ? 'text-blue-700'
                                                              : 'text-slate-400'
                                                    }`}
                                                >
                                                    {content.activityIndicator.compactLabel || content.lastActivity}
                                                </span>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {shouldRenderFilters && !isLoadingChats && (
                            <div className="flex flex-col items-center gap-2">
                                {emptyChatCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowEmptyChats((prev) => !prev)}
                                        className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:text-slate-600 hover:bg-slate-100"
                                        title={
                                            showEmptyChats
                                                ? formatText('Hide empty chats')
                                                : `${formatText('Show')} ${emptyChatCount} ${formatText('empty')}`
                                        }
                                    >
                                        {showEmptyChats ? (
                                            <EyeOffIcon className="h-3.5 w-3.5" />
                                        ) : (
                                            <EyeIcon className="h-3.5 w-3.5" />
                                        )}
                                    </button>
                                )}
                                {isAdmin && (
                                    <button
                                        type="button"
                                        onClick={() => onShowExternalChatsChange(!showExternalChats)}
                                        className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[9px] font-bold uppercase tracking-[0.18em] transition ${
                                            showExternalChats
                                                ? 'bg-slate-900 text-white'
                                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                        }`}
                                        title={
                                            showExternalChats
                                                ? formatText('Hide external chats')
                                                : formatText('Show external chats')
                                        }
                                    >
                                        EXT
                                    </button>
                                )}
                            </div>
                        )}

                        <p className="text-[11px] text-slate-400">{formatText('Chats')}</p>
                    </div>
                ) : (
                    <>
                        <div className="p-3 border-b border-slate-200">
                            <button
                                type="button"
                                onClick={handleCreateChat}
                                disabled={isCreatingChat || isLoadingChats}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                            >
                                <MessageSquarePlusIcon className="h-4 w-4" />
                                {isCreatingChat ? formatText('Creating...') : formatText('New chat')}
                            </button>
                        </div>

                        {isLoadingChats ? (
                            <ChatListLoadingSkeleton rowCount={7} />
                        ) : (
                            <div className="flex-1 overflow-y-auto scrollbar-hidden p-2 space-y-2">
                                {sidebarItems.length === 0 ? (
                                    <p className="px-2 text-xs text-slate-500">{emptyStateText}</p>
                                ) : (
                                    sidebarItems.map(({ chat, content, isActive, isEmpty }) => {
                                        return (
                                            <div
                                                key={chat.id}
                                                className={`group relative rounded-xl border ${
                                                    isActive
                                                        ? 'border-blue-300 bg-blue-50 shadow-sm'
                                                        : 'border-transparent hover:border-slate-200 hover:bg-slate-100/80'
                                                } ${isEmpty && !isActive ? 'opacity-40' : ''}`}
                                                >
                                                    <span className="absolute left-3 top-3.5 z-[5]">
                                                        <ChatSidebarActivityIndicator indicator={content.activityIndicator} />
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="w-full text-left px-3 py-3 pl-10 pr-10"
                                                        onClick={() => handleChatChoose(chat.id)}
                                                        aria-label={content.accessibilityLabel}
                                                        title={content.accessibilityLabel}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                                                                {content.title}
                                                            </div>
                                                            {content.sourceChipLabel && (
                                                                <span className="inline-flex flex-shrink-0 items-center rounded-full bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                                                                    {content.sourceChipLabel}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="mt-1 truncate text-xs text-slate-500">
                                                            {content.preview}
                                                        </div>
                                                        <div className="mt-2 flex items-center justify-between gap-2">
                                                            <div
                                                                className={`truncate text-[11px] ${
                                                                    content.activityIndicator.kind === 'scheduled'
                                                                        ? 'font-semibold text-amber-700'
                                                                        : content.activityIndicator.kind === 'running'
                                                                          ? 'font-semibold text-blue-700'
                                                                          : 'text-slate-400'
                                                                }`}
                                                            >
                                                                {content.activityIndicator.compactLabel || content.lastActivity}
                                                            </div>
                                                        </div>
                                                    </button>
                                                {!chat.isReadOnly && (
                                                    <button
                                                        type="button"
                                                        className="absolute right-2 top-2 p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-white/90 opacity-0 group-hover:opacity-100 focus-visible:outline-offset-2 focus-visible:outline focus-visible:outline-blue-400"
                                                        onClick={(event) => {
                                                            event.preventDefault();
                                                            event.stopPropagation();
                                                            onDeleteChat(chat.id);
                                                        }}
                                                        title={formatText('Delete chat')}
                                                    >
                                                        <Trash2Icon className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {shouldRenderFilters && !isLoadingChats && (
                            <div className="px-2 pb-2">
                                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-2">
                                    <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                        {formatText('Filters')}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        {emptyChatCount > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setShowEmptyChats((prev) => !prev)}
                                                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-slate-400 transition hover:text-slate-600 hover:bg-slate-100"
                                            >
                                                {showEmptyChats ? (
                                                    <>
                                                        <EyeOffIcon className="h-3.5 w-3.5" />
                                                        {formatText('Hide empty chats')}
                                                    </>
                                                ) : (
                                                    <>
                                                        <EyeIcon className="h-3.5 w-3.5" />
                                                        {`${formatText('Show')} ${emptyChatCount} ${formatText('empty')}`}
                                                    </>
                                                )}
                                            </button>
                                        )}
                                        {isAdmin && (
                                            <button
                                                type="button"
                                                onClick={() => onShowExternalChatsChange(!showExternalChats)}
                                                className={`w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition ${
                                                    showExternalChats
                                                        ? 'bg-slate-900 text-white'
                                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                                                }`}
                                            >
                                                {showExternalChats
                                                    ? formatText('Hide external chats')
                                                    : formatText('Show external chats')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
        </aside>
    );
}
