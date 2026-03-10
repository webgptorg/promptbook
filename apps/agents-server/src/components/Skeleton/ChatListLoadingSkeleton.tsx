import { Skeleton } from './Skeleton';

/**
 * Props for chat-sidebar list skeleton rendering.
 */
type ChatListLoadingSkeletonProps = {
    /**
     * Number of row placeholders to render.
     */
    readonly rowCount?: number;
    /**
     * Whether to render compact/collapsed sidebar placeholders.
     */
    readonly isCollapsed?: boolean;
};

/**
 * Placeholder rows for the chat-list sidebar while conversations are loading.
 */
export function ChatListLoadingSkeleton({ rowCount = 6, isCollapsed = false }: ChatListLoadingSkeletonProps) {
    const rows = Array.from({ length: rowCount }, (_unused, index) => index);

    if (isCollapsed) {
        return (
            <div className="flex min-h-0 flex-1 flex-col items-center gap-2 px-2 py-3" aria-hidden="true">
                {rows.map((rowIndex) => (
                    <div key={rowIndex} className="flex w-full justify-center">
                        <Skeleton className="h-11 w-11 rounded-2xl border border-slate-200/70" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2" aria-hidden="true">
            {rows.map((rowIndex) => (
                <div key={rowIndex} className="rounded-xl border border-slate-200/70 bg-white/70 p-3">
                    <Skeleton className="h-3 w-2/3 rounded-md" />
                    <Skeleton className="mt-2 h-2.5 w-full rounded-md" />
                    <Skeleton className="mt-1.5 h-2.5 w-4/5 rounded-md" />
                    <Skeleton className="mt-3 h-2 w-1/4 rounded-md" />
                </div>
            ))}
        </div>
    );
}
