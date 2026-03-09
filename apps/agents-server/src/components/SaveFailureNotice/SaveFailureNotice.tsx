/**
 * Shared fallback label for retry action when save fails.
 */
const DEFAULT_RETRY_LABEL = 'Retry save';

/**
 * Props for shared save-failure warning banner.
 */
type SaveFailureNoticeProps = {
    /**
     * Human-readable save failure detail.
     */
    readonly message: string;
    /**
     * Optional retry callback for immediate re-save.
     */
    readonly onRetry?: () => void;
    /**
     * Optional custom label for retry button.
     */
    readonly retryLabel?: string;
    /**
     * Optional class names appended to the root container.
     */
    readonly className?: string;
};

/**
 * Shared warning banner used when any save operation fails.
 */
export function SaveFailureNotice({ message, onRetry, retryLabel = DEFAULT_RETRY_LABEL, className }: SaveFailureNoticeProps) {
    return (
        <div className={`rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 ${className || ''}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <span>{message}</span>
                {onRetry && (
                    <button
                        type="button"
                        onClick={onRetry}
                        className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                    >
                        {retryLabel}
                    </button>
                )}
            </div>
        </div>
    );
}
