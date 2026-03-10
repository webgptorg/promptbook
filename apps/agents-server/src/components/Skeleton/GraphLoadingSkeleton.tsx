import { Skeleton } from './Skeleton';

/**
 * Props for graph-surface placeholder rendering.
 */
type GraphLoadingSkeletonProps = {
    /**
     * Height of the graph placeholder container.
     */
    readonly height?: number;
    /**
     * Whether the skeleton should fill an existing parent container.
     */
    readonly isInset?: boolean;
};

/**
 * Stable placeholder used while graph canvas initializes.
 */
export function GraphLoadingSkeleton({ height = 480, isInset = false }: GraphLoadingSkeletonProps) {
    const containerClassName = isInset
        ? 'relative h-full w-full overflow-hidden p-4'
        : 'relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-inner';

    return (
        <div
            className={containerClassName}
            style={isInset ? undefined : { height }}
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Loading graph"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-sky-100/40 via-transparent to-amber-100/30 blur-2xl" />
            <div className="relative z-10 flex h-full flex-col">
                <div className="grid grid-cols-3 gap-4">
                    <Skeleton className="h-16 rounded-xl" />
                    <Skeleton className="h-16 rounded-xl" />
                    <Skeleton className="h-16 rounded-xl" />
                </div>
                <div className="relative mt-6 flex-1 rounded-2xl border border-slate-200/70 bg-slate-50/80">
                    <Skeleton className="absolute left-[14%] top-[22%] h-20 w-28 rounded-2xl" />
                    <Skeleton className="absolute left-[42%] top-[34%] h-24 w-36 rounded-2xl" />
                    <Skeleton className="absolute left-[70%] top-[18%] h-20 w-32 rounded-2xl" />
                    <Skeleton className="absolute left-[58%] top-[62%] h-16 w-24 rounded-2xl" />
                </div>
            </div>
        </div>
    );
}
