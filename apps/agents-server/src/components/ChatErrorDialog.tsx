'use client';

import { useId } from 'react';
import type { FriendlyErrorMessage } from '../utils/errorMessages';
import { Dialog } from './Portal/Dialog';

/**
 * Props accepted by the reusable chat error dialog.
 */
type ChatErrorDialogProps = {
    /**
     * Friendly error metadata prepared for display.
     */
    readonly error: FriendlyErrorMessage | null;
    /**
     * Optional retry callback for recoverable failures.
     */
    readonly onRetry?: () => void;
    /**
     * Optional reset callback for resettable failures.
     */
    readonly onReset?: () => void;
    /**
     * Called when the dialog is dismissed.
     */
    readonly onDismiss: () => void;
};

/**
 * ChatErrorDialog component displays user-friendly error messages
 * with optional retry functionality
 *
 * This component follows the DRY principle by centralizing error UI logic
 * and can be reused across different chat contexts.
 */
export function ChatErrorDialog({ error, onRetry, onReset, onDismiss }: ChatErrorDialogProps) {
    const titleId = useId();
    const descriptionId = useId();

    if (!error) {
        return null;
    }

    const hasActions = error.canRetry && (onRetry || onReset);

    return (
        <Dialog
            onClose={onDismiss}
            role="alertdialog"
            ariaLabelledBy={titleId}
            ariaDescribedBy={descriptionId}
            className="mx-4 w-full max-w-md p-6"
        >
            <div className="space-y-6">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 id={titleId} className="text-lg font-semibold text-gray-900">
                            {error.title}
                        </h3>
                        <p id={descriptionId} className="mt-1 text-sm text-gray-600">
                            {error.message}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    {error.canRetry && onRetry && (
                        <button
                            onClick={() => {
                                onDismiss();
                                onRetry();
                            }}
                            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Retry
                        </button>
                    )}
                    {error.canRetry && onReset && (
                        <button
                            onClick={() => {
                                onDismiss();
                                onReset();
                            }}
                            className="flex-1 rounded-md bg-yellow-500 px-4 py-2 text-white transition-colors hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
                        >
                            Reset
                        </button>
                    )}
                    <button
                        onClick={onDismiss}
                        className={`${
                            hasActions ? 'flex-1' : 'w-full'
                        } rounded-md bg-gray-200 px-4 py-2 text-gray-800 transition-colors hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2`}
                    >
                        {hasActions ? 'Cancel' : 'Close'}
                    </button>
                </div>
            </div>
        </Dialog>
    );
}
