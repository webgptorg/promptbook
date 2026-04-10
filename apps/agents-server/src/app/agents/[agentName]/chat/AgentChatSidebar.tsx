'use client';

import type { UserChatSummary } from '../../../../utils/userChatClient';
import type { AgentChatLayoutVariant } from './AgentChatLayoutVariant';
import { AgentChatSidebarChatGptLike } from './AgentChatSidebarChatGptLike';
import { AgentChatSidebarDefault } from './AgentChatSidebarDefault';
import { useAgentChatSidebarState } from './useAgentChatSidebarState';

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
     * Href for the "New chat" link rendered in the sidebar.
     * Using a navigable link (rather than a plain button) lets the browser
     * show its native context-menu options such as "Open in new tab / window".
     */
    readonly newChatHref: string;
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
     * Controls whether the sidebar is currently visible on mobile.
     */
    readonly isMobileSidebarOpen: boolean;
    /**
     * Called when the mobile overlay should close (e.g., after navigation or backdrop tap).
     */
    readonly onCloseMobileSidebar: () => void;
    /**
     * Visual sidebar variant used by the current route.
     */
    readonly variant?: AgentChatLayoutVariant;
};

/**
 * Responsive sidebar that lists user chats and provides creation/deletion controls.
 *
 * @private Agents Server presentation logic for the agent chat experience.
 */
export function AgentChatSidebar({
    chats,
    activeChatId,
    isLoadingChats,
    formatText,
    formatChatTimestamp,
    currentTimestamp,
    onSelectChat,
    onDeleteChat,
    isAdmin,
    showExternalChats,
    onShowExternalChatsChange,
    isCollapsed,
    onToggleCollapse,
    isMobileSidebarOpen,
    onCloseMobileSidebar,
    newChatHref,
    variant = 'default',
}: AgentChatSidebarProps) {
    const sidebarState = useAgentChatSidebarState({
        chats,
        activeChatId,
        formatText,
        formatChatTimestamp,
        currentTimestamp,
        onSelectChat,
        onDeleteChat,
        isAdmin,
        isShowingExternalChats: showExternalChats,
        onShowExternalChatsChange,
        isMobileSidebarOpen,
        onCloseMobileSidebar,
    });

    if (variant === 'chatgptLike') {
        return (
            <AgentChatSidebarChatGptLike
                sidebarId={AGENT_CHAT_SIDEBAR_ID}
                isLoadingChats={isLoadingChats}
                formatText={formatText}
                newChatHref={newChatHref}
                isAdmin={isAdmin}
                isShowingExternalChats={showExternalChats}
                isMobileSidebarOpen={isMobileSidebarOpen}
                onCloseMobileSidebar={onCloseMobileSidebar}
                sidebarItems={sidebarState.sidebarItems}
                emptyChatCount={sidebarState.emptyChatCount}
                shouldRenderFilters={sidebarState.shouldRenderFilters}
                isShowingEmptyChats={sidebarState.isShowingEmptyChats}
                onToggleEmptyChatVisibility={sidebarState.toggleEmptyChatVisibility}
                onToggleExternalChatVisibility={sidebarState.toggleExternalChatVisibility}
                onChatSelect={sidebarState.handleChatSelection}
                onNewChatLinkClick={sidebarState.handleNewChatLinkClick}
                onChatDelete={sidebarState.handleChatDelete}
            />
        );
    }

    return (
        <AgentChatSidebarDefault
            sidebarId={AGENT_CHAT_SIDEBAR_ID}
            isLoadingChats={isLoadingChats}
            formatText={formatText}
            newChatHref={newChatHref}
            isAdmin={isAdmin}
            isShowingExternalChats={showExternalChats}
            isCollapsed={isCollapsed}
            isMobileSidebarOpen={isMobileSidebarOpen}
            onToggleCollapse={onToggleCollapse}
            onCloseMobileSidebar={onCloseMobileSidebar}
            sidebarItems={sidebarState.sidebarItems}
            emptyChatCount={sidebarState.emptyChatCount}
            shouldRenderFilters={sidebarState.shouldRenderFilters}
            isShowingEmptyChats={sidebarState.isShowingEmptyChats}
            onToggleEmptyChatVisibility={sidebarState.toggleEmptyChatVisibility}
            onToggleExternalChatVisibility={sidebarState.toggleExternalChatVisibility}
            onChatSelect={sidebarState.handleChatSelection}
            onNewChatLinkClick={sidebarState.handleNewChatLinkClick}
            onChatDelete={sidebarState.handleChatDelete}
        />
    );
}
