import { Skeleton } from './Skeleton';

/**
 * Default section heights used to vary stacked documentation cards.
 */
const DOC_SECTION_HEIGHTS: ReadonlyArray<number> = [220, 180, 210, 170];

/**
 * Props for documentation/card-like agent route skeletons.
 */
type AgentDocsLoadingSkeletonProps = {
    /**
     * Number of stacked content sections to render.
     */
    readonly sectionCount?: number;

    /**
     * Whether the first section should include an embedded preview block.
     */
    readonly showPreviewPanel?: boolean;

    /**
     * Max-width utility applied to the centered card.
     */
    readonly maxWidthClassName?: string;
};

/**
 * Centered header-plus-sections skeleton used by docs-like agent pages.
 */
export function AgentDocsLoadingSkeleton({
    sectionCount = 2,
    showPreviewPanel = false,
    maxWidthClassName = 'max-w-5xl',
}: AgentDocsLoadingSkeletonProps) {
    const sections = Array.from({ length: sectionCount }, (_unused, sectionIndex) => sectionIndex);

    return (
        <div
            className="min-h-screen bg-gray-50 px-4 py-6 md:px-6 md:py-12"
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Loading documentation"
        >
            <div
                className={`mx-auto w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${maxWidthClassName}`}
            >
                <div className="flex items-center gap-4 border-b border-gray-200 p-6">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="min-w-0 flex-1">
                        <Skeleton className="h-8 w-2/5 rounded-xl" />
                        <Skeleton className="mt-3 h-4 w-1/3 rounded-lg" />
                    </div>
                </div>

                <div className="space-y-6 p-6">
                    {sections.map((sectionIndex) => (
                        <section
                            key={sectionIndex}
                            className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm"
                        >
                            <div className="flex items-start gap-4">
                                <Skeleton className="h-12 w-12 rounded-xl" />
                                <div className="min-w-0 flex-1">
                                    <Skeleton className="h-6 w-52 rounded-lg" />
                                    <Skeleton className="mt-3 h-4 w-4/5 rounded-lg" />
                                </div>
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <Skeleton className="h-9 w-24 rounded-lg" />
                                <Skeleton className="h-9 w-20 rounded-lg" />
                                <Skeleton className="h-9 w-28 rounded-lg" />
                            </div>

                            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                                <Skeleton
                                    className="w-full rounded-2xl"
                                    height={DOC_SECTION_HEIGHTS[sectionIndex % DOC_SECTION_HEIGHTS.length]}
                                />
                            </div>

                            {showPreviewPanel && sectionIndex === 0 && (
                                <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                                    <Skeleton className="h-4 w-32 rounded-md" />
                                    <Skeleton className="mt-4 h-56 w-full rounded-2xl" />
                                </div>
                            )}
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}
