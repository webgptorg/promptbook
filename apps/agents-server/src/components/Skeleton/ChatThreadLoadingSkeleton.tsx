import { Skeleton } from './Skeleton';

/**
 * Width percentages used to mimic realistic chat bubble proportions.
 */
const CHAT_BUBBLE_WIDTH_PATTERN: ReadonlyArray<number> = [68, 52, 76, 58, 63, 49, 71];

/**
 * Props for chat-thread skeleton rendering.
 */
type ChatThreadLoadingSkeletonProps = {
    /**
     * Number of bubble placeholders to render.
     */
    readonly bubbleCount?: number;
    /**
     * Whether to include the composer placeholder at the bottom.
     */
    readonly withComposer?: boolean;
    /**
     * Optional class name for outer wrapper.
     */
    readonly className?: string;
};

/**
 * Placeholder chat transcript that keeps message-area geometry stable.
 */
export function ChatThreadLoadingSkeleton({
    bubbleCount = 7,
    withComposer = true,
    className = '',
}: ChatThreadLoadingSkeletonProps) {
    const bubbles = Array.from({ length: bubbleCount }, (_unused, index) => index);

    return (
        <div className={`flex h-full min-h-0 flex-col ${className}`.trim()} aria-hidden="true">
            <div className="flex-1 overflow-hidden px-4 py-4 md:px-6 md:py-6">
                <div className="flex h-full flex-col gap-3">
                    {bubbles.map((bubbleIndex) => {
                        const width = `${CHAT_BUBBLE_WIDTH_PATTERN[bubbleIndex % CHAT_BUBBLE_WIDTH_PATTERN.length]}%`;
                        const isRightAligned = bubbleIndex % 2 === 1;

                        return (
                            <div key={bubbleIndex} className={`flex ${isRightAligned ? 'justify-end' : 'justify-start'}`}>
                                <div className="max-w-[88%] space-y-2">
                                    <Skeleton
                                        className="h-3 rounded-lg"
                                        width={width}
                                    />
                                    <Skeleton
                                        className="h-3 rounded-lg"
                                        width={`calc(${width} - 12%)`}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            {withComposer && (
                <div className="border-t border-slate-200/70 bg-white/70 p-4">
                    <Skeleton className="h-12 w-full rounded-full" />
                </div>
            )}
        </div>
    );
}
