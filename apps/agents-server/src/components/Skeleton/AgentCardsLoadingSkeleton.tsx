import { Skeleton } from './Skeleton';

/**
 * Props for agent list/card placeholders.
 */
type AgentCardsLoadingSkeletonProps = {
    /**
     * Number of card placeholders to render.
     */
    readonly cardCount?: number;
    /**
     * Additional class names for the outer grid.
     */
    readonly className?: string;
};

/**
 * Reusable card-grid skeleton for home/list sections.
 */
export function AgentCardsLoadingSkeleton({ cardCount = 6, className = '' }: AgentCardsLoadingSkeletonProps) {
    const cards = Array.from({ length: cardCount }, (_unused, index) => index);

    return (
        <div
            className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${className}`.trim()}
            aria-hidden="true"
        >
            {cards.map((cardIndex) => (
                <div
                    key={cardIndex}
                    className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm"
                >
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-xl" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-3.5 w-3/4 rounded-md" />
                            <Skeleton className="h-3 w-1/2 rounded-md" />
                        </div>
                    </div>
                    <div className="mt-4 space-y-2">
                        <Skeleton className="h-2.5 w-full rounded-md" />
                        <Skeleton className="h-2.5 w-5/6 rounded-md" />
                    </div>
                </div>
            ))}
        </div>
    );
}
