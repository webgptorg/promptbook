import { Skeleton } from './Skeleton';

/**
 * Placeholder for history/timeline-style agent routes.
 */
export function AgentTimelineLoadingSkeleton() {
    const timelineItems = Array.from({ length: 4 }, (_unused, timelineIndex) => timelineIndex);

    return (
        <div
            className="container mx-auto max-w-4xl p-6"
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Loading history"
        >
            <header className="mb-8 flex items-center gap-4">
                <Skeleton className="h-14 w-14 rounded-full" />
                <div className="flex-1">
                    <Skeleton className="h-9 w-64 rounded-xl" />
                    <Skeleton className="mt-3 h-4 w-80 rounded-lg" />
                </div>
            </header>

            <div className="relative ml-4 border-l border-gray-200">
                {timelineItems.map((timelineIndex) => (
                    <div key={timelineIndex} className="relative mb-8 ml-6">
                        <span className="absolute -left-9 top-6 flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 ring-8 ring-white">
                            <Skeleton className="h-3 w-3 rounded-full" />
                        </span>
                        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <Skeleton className="h-4 w-32 rounded-md" />
                                    <Skeleton className="mt-3 h-6 w-56 rounded-lg" />
                                    <Skeleton className="mt-3 h-4 w-40 rounded-md" />
                                </div>
                                <Skeleton className="h-10 w-32 rounded-lg" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
