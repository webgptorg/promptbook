/**
 * Shared fallback label for retry action when save fails.
 */
const DEFAULT_RETRY_LABEL = 'Retry save';

/**
 * Visual variants supported by shared notice cards.
 */
export type SaveFailureNoticeVariant = 'error' | 'warning' | 'info' | 'success';

/**
 * Tailwind classes used by each notice variant.
 */
const NOTICE_VARIANT_STYLES: Record<
    SaveFailureNoticeVariant,
    {
        readonly container: string;
        readonly actionButton: string;
        readonly closeButton: string;
        readonly details: string;
    }
> = {
    error: {
        container: 'border-red-200 bg-red-50 text-red-700',
        actionButton: 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100',
        closeButton: 'text-red-700 hover:bg-red-100',
        details: 'text-red-700/90',
    },
    warning: {
        container: 'border-amber-200 bg-amber-50 text-amber-800',
        actionButton: 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100',
        closeButton: 'text-amber-800 hover:bg-amber-100',
        details: 'text-amber-800/90',
    },
    info: {
        container: 'border-sky-200 bg-sky-50 text-sky-800',
        actionButton: 'border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100',
        closeButton: 'text-sky-800 hover:bg-sky-100',
        details: 'text-sky-800/90',
    },
    success: {
        container: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        actionButton: 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
        closeButton: 'text-emerald-800 hover:bg-emerald-100',
        details: 'text-emerald-800/90',
    },
};

/**
 * Props for shared save-failure warning banner.
 */
type SaveFailureNoticeProps = {
    /**
     * Variant defining color semantics of this notice.
     */
    readonly variant?: SaveFailureNoticeVariant;
    /**
     * Human-readable save failure detail.
     */
    readonly message: string;
    /**
     * Optional additional details shown below the message.
     */
    readonly details?: string;
    /**
     * Optional retry callback for immediate re-save.
     */
    readonly onRetry?: () => void;
    /**
     * Optional action callback for generic notices.
     */
    readonly onAction?: () => void;
    /**
     * Optional custom label for retry button.
     */
    readonly retryLabel?: string;
    /**
     * Optional custom label for generic action button.
     */
    readonly actionLabel?: string;
    /**
     * Optional dismiss callback that renders close button.
     */
    readonly onDismiss?: () => void;
    /**
     * Optional click handler for the whole notice card.
     */
    readonly onClick?: () => void;
    /**
     * Optional class names appended to the root container.
     */
    readonly className?: string;
};

/**
 * Shared warning banner used when any save operation fails.
 */
export function SaveFailureNotice({
    variant = 'error',
    message,
    details,
    onRetry,
    onAction,
    retryLabel = DEFAULT_RETRY_LABEL,
    actionLabel,
    onDismiss,
    onClick,
    className,
}: SaveFailureNoticeProps) {
    const styles = NOTICE_VARIANT_STYLES[variant];
    const effectiveAction = onAction || onRetry;
    const effectiveActionLabel = actionLabel || retryLabel;

    return (
        <div
            className={`rounded-xl border px-3 py-2 text-xs ${styles.container} ${className || ''}`}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onClick={onClick}
            onKeyDown={
                onClick
                    ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              onClick();
                          }
                      }
                    : undefined
            }
        >
            <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                    <p>{message}</p>
                    {details && (
                        <p className={`mt-1 break-words whitespace-pre-wrap text-[11px] ${styles.details}`}>{details}</p>
                    )}
                </div>
                {onDismiss && (
                    <button
                        type="button"
                        aria-label="Dismiss notification"
                        onClick={(event) => {
                            event.stopPropagation();
                            onDismiss();
                        }}
                        className={`-mr-1 -mt-1 rounded-md px-2 py-1 text-sm font-semibold leading-none transition ${styles.closeButton}`}
                    >
                        X
                    </button>
                )}
            </div>
            {effectiveAction && (
                <div className="mt-2 flex justify-end">
                    <button
                        type="button"
                        onClick={effectiveAction}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${styles.actionButton}`}
                    >
                        {effectiveActionLabel}
                    </button>
                </div>
            )}
        </div>
    );
}
