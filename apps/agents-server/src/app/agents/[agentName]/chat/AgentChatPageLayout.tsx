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
     * Optional mobile trigger rendered in a reserved slot above the chat surface.
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
    const defaultShellClassName = 'agent-chat-default-shell';
    const defaultMainClassName = 'agent-chat-default-main';

    if (isHeadlessMode) {
        return (
            <div
                className={`flex h-full min-h-0 w-full overflow-hidden ${
                    isChatGptLike ? 'agent-chat-chatgpt-like-shell' : `${defaultShellClassName} ${defaultShellClassName}--headless`
                }`}
            >
                <section
                    className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
                        isChatGptLike ? '' : `${defaultMainClassName} ${defaultMainClassName}--headless`
                    }`}
                >
                    {mainTopBar}
                    {children}
                </section>
            </div>
        );
    }

    if (!isChatGptLike) {
        return (
            <div className={`${defaultShellClassName} flex h-full min-h-0 w-full overflow-hidden`}>
                {sidebar}
                <section className={`${defaultMainClassName} flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden`}>
                    {mobileSidebarTrigger && (
                        <div className="flex shrink-0 items-center justify-start pb-2 pl-[max(env(safe-area-inset-left),0.75rem)] pr-[max(env(safe-area-inset-right),0.75rem)] pt-2 md:hidden">
                            {mobileSidebarTrigger}
                        </div>
                    )}
                    {children}
                </section>
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
