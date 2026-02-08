'use client';

import type { FriendlyErrorMessage } from '../utils/errorMessages';

type ChatErrorDialogProps = {
    error: FriendlyErrorMessage | null;
    onRetry?: () => void;
    onReset?: () => void;
    onDismiss: () => void;
};

/**
 * ChatErrorDialog component displays user-friendly error messages
 * with optional retry functionality
 *
 * This component follows the DRY principle by centralizing error UI logic
 * and can be reused across different chat contexts.
 */
export function ChatErrorDialog({ error, onRetry, onReset, onDismiss }: ChatErrorDialogProps) {
    if (!error) {
        return null;
    }

    const hasActions = error.canRetry && (onRetry || onReset);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                {/* Error Icon and Title */}
                <div className="flex items-start mb-4">
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
                    <div className="ml-3 flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{error.title}</h3>
                    </div>
                </div>

                {/* Error Message */}
                <div className="mb-6">
                    <p className="text-sm text-gray-600">{error.message}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    {error.canRetry && onRetry && (
                        <button
                            onClick={() => {
                                onDismiss();
                                onRetry();
                            }}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
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
                            className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 transition-colors"
                        >
                            Reset
                        </button>
                    )}
                    <button
                        onClick={onDismiss}
                        className={`${
                            hasActions ? 'flex-1' : 'w-full'
                        } px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors`}
                    >
                        {hasActions ? 'Cancel' : 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );
}
