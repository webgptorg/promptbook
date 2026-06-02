import { Skeleton } from './Skeleton';

/**
 * Number of loading cards rendered by the documentation overview fallback.
 */
const DOCUMENTATION_CARD_COUNT = 6;

/**
 * Props for documentation and API-reference loading routes.
 */
type DocumentationRouteLoadingSkeletonProps = {
    /**
     * Accessible label announced while the route is loading.
     */
    readonly ariaLabel?: string;
    /**
     * Whether the fallback should include overview cards below the main content.
     */
    readonly showCardGrid?: boolean;
    /**
     * Whether the fallback should include a reference-style sidebar.
     */
    readonly showSidebar?: boolean;
};

/**
 * Shared documentation loading surface used by `/docs` and `/swagger`.
 */
export function DocumentationRouteLoadingSkeleton({
    ariaLabel = 'Loading documentation',
    showCardGrid = true,
    showSidebar = false,
}: DocumentationRouteLoadingSkeletonProps) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
            <div
                className="container mx-auto px-4 py-16"
                role="status"
                aria-live="polite"
                aria-busy="true"
                aria-label={ariaLabel}
            >
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-6 w-44 rounded-xl" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-36 rounded-xl" />
                        <Skeleton className="h-10 w-40 rounded-xl" />
                    </div>
                </div>

                <div className={`grid gap-6 ${showSidebar ? 'lg:grid-cols-[260px,1fr]' : ''}`}>
                    {showSidebar && (
                        <aside className="rounded-2xl border border-gray-200 bg-white/90 p-5 shadow-sm">
                            <Skeleton className="h-5 w-32 rounded-lg" />
                            <div className="mt-5 space-y-3">
                                <Skeleton className="h-9 w-full rounded-xl" />
                                <Skeleton className="h-9 w-5/6 rounded-xl" />
                                <Skeleton className="h-9 w-full rounded-xl" />
                                <Skeleton className="h-9 w-4/5 rounded-xl" />
                                <Skeleton className="h-9 w-full rounded-xl" />
                            </div>
                        </aside>
                    )}

                    <div className="space-y-6">
                        <section className="rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm">
                            <Skeleton className="h-10 w-80 max-w-full rounded-2xl" />
                            <Skeleton className="mt-4 h-4 w-full max-w-3xl rounded-lg" />
                            <Skeleton className="mt-3 h-4 w-2/3 max-w-2xl rounded-lg" />

                            <div className="mt-8 space-y-5">
                                {Array.from({ length: 3 }, (_unused, sectionIndex) => (
                                    <div key={sectionIndex} className="rounded-2xl border border-gray-200 bg-slate-50/70 p-5">
                                        <Skeleton className="h-6 w-48 rounded-xl" />
                                        <Skeleton className="mt-4 h-4 w-full rounded-lg" />
                                        <Skeleton className="mt-3 h-4 w-5/6 rounded-lg" />
                                        <Skeleton className="mt-5 h-48 w-full rounded-3xl" />
                                    </div>
                                ))}
                            </div>
                        </section>

                        {showCardGrid && !showSidebar && (
                            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                                {Array.from({ length: DOCUMENTATION_CARD_COUNT }, (_unused, cardIndex) => (
                                    <div
                                        key={cardIndex}
                                        className="rounded-2xl border border-gray-200 bg-white/90 p-5 shadow-sm"
                                    >
                                        <Skeleton className="h-6 w-2/3 rounded-xl" />
                                        <Skeleton className="mt-4 h-4 w-full rounded-lg" />
                                        <Skeleton className="mt-3 h-4 w-5/6 rounded-lg" />
                                        <Skeleton className="mt-6 h-28 w-full rounded-3xl" />
                                    </div>
                                ))}
                            </section>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
