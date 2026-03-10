import { AgentCardsLoadingSkeleton } from './AgentCardsLoadingSkeleton';
import { GraphLoadingSkeleton } from './GraphLoadingSkeleton';
import { Skeleton } from './Skeleton';

/**
 * Props for home-route skeleton rendering.
 */
type HomepageLoadingSkeletonProps = {
    /**
     * Whether graph placeholder should be shown together with list placeholders.
     */
    readonly showGraphPlaceholder?: boolean;
};

/**
 * Placeholder for large home/list route loads.
 */
export function HomepageLoadingSkeleton({ showGraphPlaceholder = true }: HomepageLoadingSkeletonProps) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div
                className="container mx-auto px-4 py-16"
                role="status"
                aria-live="polite"
                aria-busy="true"
                aria-label="Loading home"
            >
                <div className="space-y-8">
                    <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-sm">
                        <Skeleton className="h-8 w-1/2 rounded-xl" />
                        <Skeleton className="mt-3 h-4 w-3/4 rounded-lg" />
                    </div>

                    <section className="mt-16">
                        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                            <Skeleton className="h-10 w-72 rounded-xl" />
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-9 w-20 rounded-lg" />
                                <Skeleton className="h-9 w-20 rounded-lg" />
                            </div>
                        </div>
                        <AgentCardsLoadingSkeleton cardCount={8} />
                    </section>

                    {showGraphPlaceholder && <GraphLoadingSkeleton height={520} />}
                </div>
            </div>
        </div>
    );
}
