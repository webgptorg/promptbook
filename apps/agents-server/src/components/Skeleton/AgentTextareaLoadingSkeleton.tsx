import { Skeleton } from './Skeleton';

/**
 * Layout-matching placeholder for the textarea-first agent entry page.
 */
export function AgentTextareaLoadingSkeleton() {
    return (
        <div
            className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-10"
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Loading textarea chat"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-white to-slate-200" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/60 to-transparent" />

            <div className="relative z-10 w-full max-w-3xl">
                <div className="mb-6 flex flex-col items-center text-center">
                    <Skeleton className="h-24 w-24 rounded-full border border-white/80 bg-white/70 shadow-lg" />
                    <Skeleton className="mt-4 h-8 w-48 rounded-xl" />
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur-sm">
                    <Skeleton className="h-72 w-full rounded-2xl border border-slate-200 bg-white" />
                    <div className="mt-3 flex items-center justify-between gap-4">
                        <Skeleton className="h-3 w-44 max-w-[60%] rounded-md" />
                        <Skeleton className="h-8 w-20 rounded-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}
