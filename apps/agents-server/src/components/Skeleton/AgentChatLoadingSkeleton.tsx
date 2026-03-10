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
            className="h-full w-full min-h-0 bg-slate-50/80"
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Loading chat"
        >
            <div className="flex h-full min-h-0">
                {showSidebar && (
                    <aside
                        className={`hidden border-r border-slate-200/80 bg-white/90 backdrop-blur md:flex md:flex-col ${
                            isSidebarCollapsed ? 'md:w-20' : 'md:w-72'
                        }`}
                    >
                        <div className="border-b border-slate-200/70 p-3">
                            <Skeleton className="h-10 w-full rounded-lg" />
                        </div>
                        <ChatListLoadingSkeleton isCollapsed={isSidebarCollapsed} />
                    </aside>
                )}
                <section className="flex min-w-0 flex-1 flex-col">
                    <ChatThreadLoadingSkeleton />
                </section>
            </div>
        </div>
    );
}
