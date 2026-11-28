import { ChatThreadLoadingSkeleton } from './ChatThreadLoadingSkeleton';
import { Skeleton } from './Skeleton';

/**
 * Layout-matching placeholder for the split book-and-chat route.
 */
export function AgentSplitEditorChatLoadingSkeleton() {
    return (
        <div
            className="agents-server-viewport-width min-h-[calc(100dvh-60px)] w-full bg-white"
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Loading split editor and chat"
        >
            <div className="flex min-h-[calc(100dvh-60px)] flex-col lg:hidden">
                <div className="flex-1 p-4">
                    <div className="h-full overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50/70">
                        <div className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3">
                            <div className="flex gap-2">
                                <Skeleton className="h-9 w-28 rounded-lg" />
                                <Skeleton className="h-9 w-24 rounded-lg" />
                            </div>
                            <Skeleton className="h-8 w-24 rounded-full" />
                        </div>
                        <div className="space-y-3 p-4">
                            <Skeleton className="h-3 w-11/12 rounded-md" />
                            <Skeleton className="h-3 w-3/4 rounded-md" />
                            <Skeleton className="h-3 w-10/12 rounded-md" />
                            <Skeleton className="h-48 w-full rounded-2xl" />
                        </div>
                    </div>
                </div>
                <div className="border-t border-slate-200 bg-white px-4 py-3">
                    <div className="grid grid-cols-2 gap-3">
                        <Skeleton className="h-12 rounded-xl" />
                        <Skeleton className="h-12 rounded-xl" />
                    </div>
                </div>
            </div>

            <div className="hidden min-h-[calc(100dvh-60px)] gap-4 p-4 lg:flex">
                <section className="flex min-h-0 min-w-0 flex-[1.1] flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50/70">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3">
                        <div className="flex gap-2">
                            <Skeleton className="h-9 w-32 rounded-lg" />
                            <Skeleton className="h-9 w-28 rounded-lg" />
                        </div>
                        <div className="flex gap-2">
                            <Skeleton className="h-8 w-20 rounded-full" />
                            <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                    </div>
                    <div className="space-y-3 p-4">
                        <Skeleton className="h-3 w-[88%] rounded-md" />
                        <Skeleton className="h-3 w-[72%] rounded-md" />
                        <Skeleton className="h-3 w-[84%] rounded-md" />
                        <Skeleton className="h-3 w-[68%] rounded-md" />
                        <Skeleton className="h-56 w-full rounded-2xl" />
                    </div>
                </section>

                <section className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-lg shadow-slate-900/5">
                    <div className="border-b border-slate-200 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                            <Skeleton className="h-9 w-36 rounded-lg" />
                            <Skeleton className="h-8 w-24 rounded-full" />
                        </div>
                    </div>
                    <ChatThreadLoadingSkeleton />
                </section>
            </div>
        </div>
    );
}
