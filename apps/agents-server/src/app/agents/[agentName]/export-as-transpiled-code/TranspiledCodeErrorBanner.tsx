'use client';

/**
 * Props for a single export error banner.
 *
 * @private type of `<TranspiledCodeErrorBanner/>`
 */
type TranspiledCodeErrorBannerProps = {
    /**
     * Error message to show, or `null`/empty to render nothing.
     */
    readonly message: string | null;
};

/**
 * Renders a single red error banner, or nothing when there is no message.
 *
 * @private internal component of `<AgentCodePageClient/>`
 */
export function TranspiledCodeErrorBanner({ message }: TranspiledCodeErrorBannerProps) {
    if (!message) {
        return null;
    }

    return (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {message}
        </div>
    );
}
