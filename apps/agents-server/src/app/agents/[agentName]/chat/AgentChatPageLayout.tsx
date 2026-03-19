import type { ReactNode } from 'react';
import type { AgentChatLayoutVariant } from './AgentChatLayoutVariant';

/**
 * Props for the shared full-height agent chat shell.
 */
type AgentChatPageLayoutProps = {
    /**
     * Visual shell variant that wraps the shared chat state.
     */
    readonly variant?: AgentChatLayoutVariant;
    /**
     * Whether the layout should omit chrome intended for embedded/headless mode.
     */
    readonly isHeadlessMode?: boolean;
    /**
     * Optional left sidebar element.
     */
    readonly sidebar?: ReactNode;
    /**
     * Optional floating trigger used by the default layout on mobile.
     */
    readonly mobileSidebarTrigger?: ReactNode;
    /**
     * Optional top bar rendered inside the main section.
     */
    readonly mainTopBar?: ReactNode;
    /**
     * Main chat surface content.
     */
    readonly children: ReactNode;
};

/**
 * Shared viewport-filling shell used by agent chat layouts.
 */
export function AgentChatPageLayout({
    variant = 'default',
    isHeadlessMode = false,
    sidebar,
    mobileSidebarTrigger,
    mainTopBar,
    children,
}: AgentChatPageLayoutProps) {
    const isChatGptLike = variant === 'chatgptLike';

    if (isHeadlessMode) {
        return (
            <div
                className={`flex h-full min-h-0 w-full overflow-hidden ${
                    isChatGptLike ? 'agent-chat-chatgpt-like-shell' : 'bg-slate-50/80'
                }`}
            >
                <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    {mainTopBar}
                    {children}
                </section>
            </div>
        );
    }

    if (!isChatGptLike) {
        return (
            <div className="flex h-full min-h-0 w-full overflow-hidden bg-slate-50/80">
                {sidebar}
                {mobileSidebarTrigger}
                <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</section>
            </div>
        );
    }

    return (
        <div className="agent-chat-chatgpt-like-shell flex h-full min-h-0 w-full overflow-hidden">
            {sidebar}
            <section className="agent-chat-chatgpt-like-main flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                {mainTopBar}
                {children}
            </section>
        </div>
    );
}
