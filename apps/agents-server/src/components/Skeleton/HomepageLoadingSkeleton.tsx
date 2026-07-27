import { AgentCardsLoadingSkeleton } from './AgentCardsLoadingSkeleton';
import { Skeleton } from './Skeleton';

/**
 * Placeholder for large home/list route loads.
 */
export function HomepageLoadingSkeleton() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
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
                        </div>
                        <AgentCardsLoadingSkeleton cardCount={8} />
                    </section>
                </div>
            </div>
        </div>
    );
}
