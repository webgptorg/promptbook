import { Skeleton } from './Skeleton';

/**
 * Default table/card heights used by the console-style loading skeleton.
 */
const DEFAULT_PANEL_HEIGHTS: ReadonlyArray<number> = [320, 220];

/**
 * Props for the generic console-style route loading skeleton.
 */
type ConsolePageLoadingSkeletonProps = {
    /**
     * Accessible label announced while the route is loading.
     */
    readonly ariaLabel?: string;
    /**
     * Optional max-width utility for the centered page container.
     */
    readonly maxWidthClassName?: string;
    /**
     * Whether a row of summary metric cards should be rendered.
     */
    readonly showSummaryCards?: boolean;
    /**
     * Whether a filters/settings card should be rendered above the main content.
     */
    readonly showFiltersCard?: boolean;
    /**
     * Heights of the main content panels.
     */
    readonly panelHeights?: ReadonlyArray<number>;
};

/**
 * Generic admin/system/table loading surface reused by slow control-panel style routes.
 */
export function ConsolePageLoadingSkeleton({
    ariaLabel = 'Loading page',
    maxWidthClassName = 'max-w-screen-xl',
    showSummaryCards = false,
    showFiltersCard = false,
    panelHeights = DEFAULT_PANEL_HEIGHTS,
}: ConsolePageLoadingSkeletonProps) {
    const normalizedPanelHeights = panelHeights.length > 0 ? panelHeights : DEFAULT_PANEL_HEIGHTS;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
            <div
                className={`mx-auto w-full px-4 py-8 sm:px-6 sm:py-10 ${maxWidthClassName}`}
                role="status"
                aria-live="polite"
                aria-busy="true"
                aria-label={ariaLabel}
            >
                <div className="space-y-6 pt-16">
                    <section className="space-y-3">
                        <Skeleton className="h-3 w-24 rounded-full" />
                        <Skeleton className="h-10 w-72 max-w-full rounded-2xl" />
                        <Skeleton className="h-4 w-full max-w-3xl rounded-lg" />
                        <Skeleton className="h-4 w-2/3 max-w-2xl rounded-lg" />
                    </section>

                    {showSummaryCards && (
                        <section className="grid gap-4 md:grid-cols-3">
                            {Array.from({ length: 3 }, (_unused, cardIndex) => (
                                <div
                                    key={cardIndex}
                                    className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm"
                                >
                                    <Skeleton className="h-4 w-28 rounded-lg" />
                                    <Skeleton className="mt-4 h-9 w-20 rounded-xl" />
                                    <Skeleton className="mt-3 h-4 w-36 rounded-lg" />
                                </div>
                            ))}
                        </section>
                    )}

                    {showFiltersCard && (
                        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
                            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
                                {Array.from({ length: 4 }, (_unused, filterIndex) => (
                                    <div key={filterIndex} className="space-y-3">
                                        <Skeleton className="h-4 w-24 rounded-lg" />
                                        <Skeleton className="h-11 w-full rounded-2xl" />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {normalizedPanelHeights.map((panelHeight, panelIndex) => (
                        <section
                            key={panelIndex}
                            className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm"
                        >
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div className="space-y-3">
                                    <Skeleton className="h-6 w-56 rounded-xl" />
                                    <Skeleton className="h-4 w-72 max-w-full rounded-lg" />
                                </div>
                                <div className="flex gap-2">
                                    <Skeleton className="h-10 w-24 rounded-xl" />
                                    <Skeleton className="h-10 w-28 rounded-xl" />
                                </div>
                            </div>

                            <div className="mt-6 space-y-3">
                                <Skeleton className="h-12 w-full rounded-2xl" />
                                <Skeleton className="h-12 w-full rounded-2xl" />
                                <Skeleton className="h-12 w-full rounded-2xl" />
                                <Skeleton className="w-full rounded-3xl" height={panelHeight} />
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}
