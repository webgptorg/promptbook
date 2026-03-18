import { Skeleton } from './Skeleton';

/**
 * Width pattern used to emulate code-like line lengths in the export view.
 */
const CODE_LINE_WIDTHS: ReadonlyArray<string> = ['88%', '76%', '92%', '67%', '84%', '71%', '90%', '63%'];

/**
 * Skeleton for agent pages centered around one selector and one large code viewer.
 */
export function AgentCodeViewerLoadingSkeleton() {
    return (
        <div
            className="min-h-screen bg-gray-50 px-4 py-6 md:px-6 md:py-12"
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Loading generated code"
        >
            <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-4 border-b border-gray-200 p-6">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="min-w-0 flex-1">
                        <Skeleton className="h-8 w-2/5 rounded-xl" />
                        <Skeleton className="mt-3 h-4 w-1/3 rounded-lg" />
                    </div>
                </div>

                <div className="p-6">
                    <Skeleton className="h-4 w-32 rounded-md" />
                    <Skeleton className="mt-3 h-11 w-full rounded-lg" />

                    <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70">
                        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                            <Skeleton className="h-6 w-48 rounded-lg" />
                            <Skeleton className="h-4 w-24 rounded-md" />
                        </div>

                        <div className="p-4">
                            <div className="rounded-lg border border-slate-200 bg-white p-4">
                                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3">
                                    {CODE_LINE_WIDTHS.map((width, lineIndex) => (
                                        <div key={lineIndex} className="contents">
                                            <Skeleton className="h-3 w-6 rounded-md" />
                                            <Skeleton className="h-3 rounded-md" width={width} />
                                        </div>
                                    ))}
                                </div>
                                <Skeleton className="mt-5 h-56 w-full rounded-2xl" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
