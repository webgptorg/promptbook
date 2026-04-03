import { ChatListLoadingSkeleton } from './ChatListLoadingSkeleton';
import { ChatThreadLoadingSkeleton } from './ChatThreadLoadingSkeleton';
import { Skeleton } from './Skeleton';

/**
 * Props for full chat-layout skeleton rendering.
 */
type AgentChatLoadingSkeletonProps = {
    /**
     * Whether the chat list sidebar should be rendered.
     */
    readonly showSidebar?: boolean;
    /**
     * Whether the sidebar should use compact/collapsed placeholders.
     */
    readonly isSidebarCollapsed?: boolean;
};

/**
 * Full-page chat skeleton matching the sidebar + transcript layout.
 */
export function AgentChatLoadingSkeleton({
    showSidebar = true,
    isSidebarCollapsed = false,
}: AgentChatLoadingSkeletonProps) {
    return (
        <div
            className="agent-chat-default-shell agent-chat-loading-shell h-full w-full min-h-0"
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Loading chat"
        >
            <div className="flex h-full min-h-0">
                {showSidebar && (
                    <aside
                        className={`agent-chat-default-sidebar agent-chat-loading-shell__sidebar hidden md:flex md:flex-col ${
                            isSidebarCollapsed ? 'md:w-20' : 'md:w-72'
                        }`}
                    >
                        <div className="agent-chat-default-sidebar__header border-b border-slate-200/70 p-3">
                            <Skeleton className="h-10 w-full rounded-lg" />
                        </div>
                        <ChatListLoadingSkeleton isCollapsed={isSidebarCollapsed} />
                    </aside>
                )}
                <section
                    className={`agent-chat-default-main flex min-w-0 flex-1 flex-col ${
                        showSidebar ? '' : 'agent-chat-default-main--headless'
                    }`}
                >
                    <div className="agent-chat-panel agent-chat-panel--default flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
                        <div className="agent-chat-panel__inner agent-chat-panel__inner--default flex min-h-0 flex-1 overflow-hidden">
                            <div className="agent-chat-panel__chat agent-chat-panel__chat--default agent-chat-panel__chat--loading flex h-full min-h-0 w-full flex-col overflow-hidden">
                                <ChatThreadLoadingSkeleton className="agent-chat-loading-thread" />
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
