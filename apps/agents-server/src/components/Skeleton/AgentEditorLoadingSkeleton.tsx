import { Skeleton } from './Skeleton';

/**
 * Width pattern used to mimic uneven editor code blocks.
 */
const EDITOR_LINE_WIDTHS: ReadonlyArray<string> = ['92%', '68%', '81%', '73%', '88%', '64%', '77%', '70%'];

/**
 * Props for editor/workbench skeleton rendering.
 */
type AgentEditorLoadingSkeletonProps = {
    /**
     * Whether the desktop-only side panel placeholder should be shown.
     */
    readonly showSidePanel?: boolean;
};

/**
 * Full-height editor skeleton used by book-style agent pages.
 */
export function AgentEditorLoadingSkeleton({ showSidePanel = true }: AgentEditorLoadingSkeletonProps) {
    return (
        <div
            className="agents-server-viewport-width min-h-[calc(100dvh-60px)] w-full bg-slate-100/80 p-4 dark:bg-slate-950/92 md:p-6"
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Loading editor"
        >
            <div className="flex min-h-[calc(100dvh-92px)] gap-4">
                <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-lg shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-950 dark:shadow-slate-950/30">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/90">
                        <div className="flex flex-wrap items-center gap-2">
                            <Skeleton className="h-9 w-32 rounded-lg" />
                            <Skeleton className="h-9 w-40 rounded-lg" />
                            <Skeleton className="h-9 w-28 rounded-lg" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-8 w-28 rounded-full" />
                            <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                    </div>

                    <div className="flex min-h-0 flex-1 overflow-hidden">
                        <div className="hidden w-14 shrink-0 flex-col gap-3 border-r border-slate-200 bg-slate-50/70 px-3 py-5 dark:border-slate-700 dark:bg-slate-900/88 md:flex">
                            <Skeleton className="h-3 w-6 rounded-md" />
                            <Skeleton className="h-3 w-6 rounded-md" />
                            <Skeleton className="h-3 w-6 rounded-md" />
                            <Skeleton className="h-3 w-6 rounded-md" />
                            <Skeleton className="h-3 w-6 rounded-md" />
                            <Skeleton className="h-3 w-6 rounded-md" />
                        </div>

                        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 py-5 md:px-6">
                            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3">
                                {EDITOR_LINE_WIDTHS.map((width, lineIndex) => (
                                    <div key={lineIndex} className="contents">
                                        <Skeleton className="h-3 w-6 rounded-md" />
                                        <Skeleton className="h-3 rounded-md" width={width} />
                                    </div>
                                ))}
                            </div>

                            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/88">
                                <Skeleton className="h-4 w-40 rounded-lg" />
                                <Skeleton className="mt-4 h-3 w-full rounded-md" />
                                <Skeleton className="mt-2 h-3 w-5/6 rounded-md" />
                                <Skeleton className="mt-2 h-3 w-4/6 rounded-md" />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/90">
                        <div className="flex flex-wrap items-center gap-3">
                            <Skeleton className="h-4 w-32 rounded-md" />
                            <Skeleton className="h-4 w-24 rounded-md" />
                            <Skeleton className="h-4 w-20 rounded-md" />
                        </div>
                    </div>
                </section>

                {showSidePanel && (
                    <aside className="hidden w-80 shrink-0 flex-col gap-4 rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-lg shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-950/88 dark:shadow-slate-950/30 xl:flex">
                        <Skeleton className="h-4 w-32 rounded-md" />
                        <div className="space-y-3">
                            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/88">
                                <Skeleton className="h-4 w-2/3 rounded-md" />
                                <Skeleton className="mt-3 h-3 w-full rounded-md" />
                                <Skeleton className="mt-2 h-3 w-5/6 rounded-md" />
                                <Skeleton className="mt-4 h-9 w-full rounded-lg" />
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/88">
                                <Skeleton className="h-4 w-1/2 rounded-md" />
                                <Skeleton className="mt-3 h-3 w-full rounded-md" />
                                <Skeleton className="mt-2 h-3 w-4/5 rounded-md" />
                            </div>
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}
