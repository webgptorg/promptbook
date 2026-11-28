import type { ReactNode } from 'react';

/**
 * Props for the shared full-height agent chat shell.
 */
type AgentChatPageLayoutProps = {
    /**
     * Whether the layout should omit chrome intended for embedded/headless mode.
     */
    readonly isHeadlessMode?: boolean;
    /**
     * Optional left sidebar element.
     */
    readonly sidebar?: ReactNode;
    readonly children: ReactNode;
};

/**
 * Shared viewport-filling shell used by agent chat layouts.
 */
export function AgentChatPageLayout({
    isHeadlessMode = false,
    sidebar,
    children,
}: AgentChatPageLayoutProps) {
    if (isHeadlessMode) {
        return <div className="flex h-full min-h-0 w-full overflow-hidden bg-slate-50/80 dark:bg-slate-950">{children}</div>;
    }

    return (
        <div className="flex h-full min-h-0 w-full overflow-hidden bg-slate-50/80 dark:bg-slate-950">
            {sidebar}
            <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</section>
        </div>
    );
}
