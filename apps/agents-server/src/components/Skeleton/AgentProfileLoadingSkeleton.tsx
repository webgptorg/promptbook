import { ChatThreadLoadingSkeleton } from './ChatThreadLoadingSkeleton';
import { Skeleton } from './Skeleton';

/**
 * Props for the agent-profile route skeleton.
 */
type AgentProfileLoadingSkeletonProps = {
    /**
     * Whether profile actions/menu placeholders should be hidden for headless mode.
     */
    readonly isHeadless?: boolean;
};

/**
 * Layout-matching placeholder for the agent profile page.
 */
export function AgentProfileLoadingSkeleton({ isHeadless = false }: AgentProfileLoadingSkeletonProps) {
    return (
        <div
            className={`relative flex w-full flex-col items-center justify-center overflow-hidden p-6 md:p-12 ${
                isHeadless ? 'min-h-screen' : 'min-h-[calc(100vh-60px)]'
            }`}
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Loading agent profile"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-white to-indigo-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900" />
            {!isHeadless && (
                <div className="absolute right-4 top-4 z-20">
                    <Skeleton className="h-10 w-10 rounded-full" />
                </div>
            )}
            <div className="relative z-10 grid w-full max-w-5xl grid-cols-1 items-start gap-y-6 md:grid-cols-[auto_1fr] md:gap-x-12 md:gap-y-4">
                <div className="mx-auto w-full max-w-sm md:mx-0 md:w-80 md:row-span-3">
                    <div style={{ aspectRatio: '1 / 1.618' }}>
                        <Skeleton className="h-full w-full rounded-[28px]" />
                    </div>
                </div>
                <div className="flex w-full flex-col items-start gap-4 md:gap-6">
                    <Skeleton className="h-10 w-3/4 rounded-xl md:h-12" />
                    <Skeleton className="h-4 w-full rounded-lg" />
                    <Skeleton className="h-4 w-5/6 rounded-lg" />
                    <div className="flex flex-wrap gap-2">
                        <Skeleton className="h-7 w-24 rounded-full" />
                        <Skeleton className="h-7 w-20 rounded-full" />
                        <Skeleton className="h-7 w-28 rounded-full" />
                    </div>
                </div>
                <div className="w-full md:col-start-2">
                    <div className="relative h-[calc(100dvh-300px)] min-h-[350px] rounded-[32px] border border-white/40 bg-white/70 p-4 shadow-2xl backdrop-blur-2xl md:h-[500px] md:min-h-[420px] dark:border-slate-700/70 dark:bg-slate-900/45">
                        <ChatThreadLoadingSkeleton withComposer className="rounded-[24px] border border-white/40 bg-white/75 dark:border-slate-700/70 dark:bg-slate-950/50" />
                    </div>
                </div>
                {!isHeadless && (
                    <div className="flex w-full flex-wrap items-center gap-4 md:col-start-2 md:mt-2 md:gap-6">
                        <Skeleton className="h-9 w-36 rounded-full" />
                        <Skeleton className="h-9 w-40 rounded-full" />
                    </div>
                )}
            </div>
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-200/50 to-transparent dark:from-slate-950/80" />
        </div>
    );
}
