'use client';

import { ChevronLeftIcon, ChevronRightIcon, MessageSquarePlusIcon, Trash2Icon, XIcon } from 'lucide-react';
import type { UserChatSummary } from '../../../../utils/userChatClient';

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
     * Formatter for localized labels.
     */
    readonly formatText: (text: string) => string;
    /**
     * Timestamp formatter shared with the parent component.
     */
    readonly formatChatTimestamp: (timestamp: string) => string;
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
     * Controls whether the desktop sidebar is collapsed into a slim strip.
     */
    readonly isCollapsed: boolean;
    /**
     * Toggles the collapsed state of the sidebar.
     */
    readonly onToggleCollapse: () => void;
    /**
     * Controls whether the sidebar is currently visible on mobile.
     */
    readonly isMobileSidebarOpen: boolean;
    /**
     * Called when the mobile overlay should close (e.g., after navigation or backdrop tap).
     */
    readonly onCloseMobileSidebar: () => void;
};

/**
 * Responsive sidebar that lists user chats and provides creation/deletion controls.
 *
 * @private Agents Server presentation logic for the agent chat experience.
 */
export function AgentChatSidebar({
    chats,
    activeChatId,
    isCreatingChat,
    formatText,
    formatChatTimestamp,
    onSelectChat,
    onCreateChat,
    onDeleteChat,
    isCollapsed,
    onToggleCollapse,
    isMobileSidebarOpen,
    onCloseMobileSidebar,
}: AgentChatSidebarProps) {
    const widthClasses = isCollapsed ? 'w-72 md:w-24' : 'w-72 md:w-72';
    const transformClasses = isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full';
    const panelTransitionClasses = 'transition-all duration-300 ease-in-out will-change-transform';
    const overlayTransitionClasses = 'transition-opacity duration-300 ease-in-out';
    const mobileOverlayState = isMobileSidebarOpen
        ? 'opacity-100 pointer-events-auto'
        : 'opacity-0 pointer-events-none';
    const desktopOverlayState = isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto';

    const handleChatChoose = (chatId: string) => {
        onSelectChat(chatId);
        if (isMobileSidebarOpen) {
            onCloseMobileSidebar();
        }
    };

    const handleCreateAndClose = () => {
        onCreateChat();
        if (isMobileSidebarOpen) {
            onCloseMobileSidebar();
        }
    };

    const emptyStateText = formatText('No chats yet');

    return (
        <>
            <aside
                id={AGENT_CHAT_SIDEBAR_ID}
                className={`fixed inset-y-0 left-0 z-[60] flex flex-col border-r border-slate-200 bg-white/95 shadow-xl backdrop-blur ${panelTransitionClasses} md:static md:shadow-none md:bg-white/90 ${widthClasses} ${transformClasses} md:translate-x-0`}
            >
                <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={onToggleCollapse}
                            className="p-1 text-slate-500 hover:text-slate-900 focus-visible:outline-offset-2 focus-visible:outline focus-visible:outline-blue-400"
                            aria-label={isCollapsed ? formatText('Expand sidebar') : formatText('Collapse sidebar')}
                        >
                            {isCollapsed ? (
                                <ChevronRightIcon className="h-4 w-4" />
                            ) : (
                                <ChevronLeftIcon className="h-4 w-4" />
                            )}
                        </button>
                        <button
                            type="button"
                            className="md:hidden p-1 text-slate-500 hover:text-slate-900 focus-visible:outline-offset-2 focus-visible:outline focus-visible:outline-blue-400"
                            onClick={onCloseMobileSidebar}
                            aria-label={formatText('Close chats sidebar')}
                        >
                            <XIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {isCollapsed ? (
                    <div className="flex flex-col items-center gap-3 overflow-hidden px-1 py-4">
                        <button
                            type="button"
                            onClick={handleCreateAndClose}
                            disabled={isCreatingChat}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60"
                            title={formatText('New chat')}
                        >
                            <MessageSquarePlusIcon className="h-5 w-5" />
                        </button>

                        <div className="flex flex-1 w-full flex-col gap-2 overflow-y-auto px-1">
                            {chats.map((chat) => {
                                const displayTitle = chat.title || formatText('New chat');
                                const previewText = chat.preview || formatText('No messages yet');
                                const lastActivity = formatChatTimestamp(chat.lastMessageAt || chat.updatedAt);
                                const initial = displayTitle.charAt(0).toUpperCase();
                                const isActive = chat.id === activeChatId;
                                return (
                                    <button
                                        key={chat.id}
                                        type="button"
                                        onClick={() => handleChatChoose(chat.id)}
                                        className={`flex w-full items-start gap-2 rounded-xl border px-2 py-2 transition focus-visible:outline-offset-2 focus-visible:outline focus-visible:outline-blue-400 ${
                                            isActive
                                                ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-sm'
                                                : 'border-transparent bg-slate-100/80 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                                        }`}
                                        aria-label={displayTitle}
                                        title={displayTitle}
                                    >
                                        <span
                                            className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${
                                                isActive
                                                    ? 'border-blue-400 bg-blue-50 text-blue-700'
                                                    : 'border-slate-200 bg-white text-slate-400'
                                            }`}
                                        >
                                            {initial}
                                        </span>

                                        <div className="flex flex-1 flex-col gap-0.5 text-[10px] leading-tight">
                                            <span className="font-semibold text-slate-900 truncate">
                                                {displayTitle}
                                            </span>
                                            <span className="text-slate-500 truncate">{previewText}</span>
                                            <span className="text-slate-400">{lastActivity}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <p className="text-[11px] text-slate-400">{formatText('Chats')}</p>
                    </div>
                ) : (
                    <>
                        <div className="p-3 border-b border-slate-200">
                            <button
                                type="button"
                                onClick={handleCreateAndClose}
                                disabled={isCreatingChat}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                            >
                                <MessageSquarePlusIcon className="h-4 w-4" />
                                {isCreatingChat ? formatText('Creating...') : formatText('New chat')}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {chats.length === 0 ? (
                                <p className="px-2 text-xs text-slate-500">{emptyStateText}</p>
                            ) : (
                                chats.map((chat) => {
                                    const isActive = chat.id === activeChatId;
                                    return (
                                        <div
                                            key={chat.id}
                                            className={`group relative rounded-xl border ${
                                                isActive
                                                    ? 'border-blue-300 bg-blue-50 shadow-sm'
                                                    : 'border-transparent hover:border-slate-200 hover:bg-slate-100/80'
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                className="w-full text-left px-3 py-3 pr-10"
                                                onClick={() => handleChatChoose(chat.id)}
                                            >
                                                <div className="text-sm font-medium text-slate-800 truncate">
                                                    {chat.title || formatText('New chat')}
                                                </div>
                                                <div className="text-xs text-slate-500 truncate mt-1">
                                                    {chat.preview || formatText('No messages yet')}
                                                </div>
                                                <div className="text-[11px] text-slate-400 mt-2">
                                                    {formatChatTimestamp(chat.lastMessageAt || chat.updatedAt)}
                                                </div>
                                            </button>
                                            <button
                                                type="button"
                                                className="absolute right-2 top-2 p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-white/90 opacity-0 group-hover:opacity-100 focus-visible:outline-offset-2 focus-visible:outline focus-visible:outline-blue-400"
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    onDeleteChat(chat.id);
                                                    if (isMobileSidebarOpen) {
                                                        onCloseMobileSidebar();
                                                    }
                                                }}
                                                title={formatText('Delete chat')}
                                            >
                                                <Trash2Icon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </>
                )}
            </aside>

            <div
                className={`hidden md:block fixed inset-0 z-50 bg-slate-900/40 ${overlayTransitionClasses} ${desktopOverlayState}`}
                onClick={onToggleCollapse}
                aria-hidden="true"
            />

            <div
                className={`fixed inset-0 z-50 bg-slate-900/40 ${overlayTransitionClasses} ${mobileOverlayState} md:hidden`}
                onClick={onCloseMobileSidebar}
                aria-hidden="true"
            />
        </>
    );
}
