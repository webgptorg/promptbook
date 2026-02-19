'use client';

import { MarkdownContent } from '@promptbook-local/components';

/**
 * Props for the blocking META DISCLAIMER dialog shown before chat interaction.
 */
type MetaDisclaimerDialogProps = {
    markdown: string | null;
    isLoading: boolean;
    isAccepting: boolean;
    errorMessage: string | null;
    onAccept: () => void;
    onRetry: () => void;
};

/**
 * Modal dialog that blocks chat usage until the disclaimer status is resolved and accepted.
 */
export function MetaDisclaimerDialog({
    markdown,
    isLoading,
    isAccepting,
    errorMessage,
    onAccept,
    onRetry,
}: MetaDisclaimerDialogProps) {
    const isAcceptButtonDisabled = isLoading || isAccepting || Boolean(errorMessage) || !markdown;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/55 backdrop-blur-[1px]">
            <div className="mx-4 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <header className="border-b border-slate-200 px-6 py-4">
                    <h2 className="text-lg font-semibold text-slate-900">Please review before chatting</h2>
                </header>

                <div className="max-h-[55vh] overflow-y-auto px-6 py-5">
                    {isLoading && <p className="text-sm text-slate-600">Loading disclaimer...</p>}

                    {!isLoading && errorMessage && (
                        <div className="space-y-3">
                            <p className="text-sm text-red-700">{errorMessage}</p>
                            <button
                                type="button"
                                onClick={onRetry}
                                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {!isLoading && !errorMessage && markdown && (
                        <article className="prose prose-slate max-w-none">
                            <MarkdownContent content={markdown} />
                        </article>
                    )}
                </div>

                <footer className="flex items-center justify-end border-t border-slate-200 px-6 py-4">
                    <button
                        type="button"
                        disabled={isAcceptButtonDisabled}
                        onClick={onAccept}
                        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                        {isAccepting ? 'Saving...' : 'I Agree'}
                    </button>
                </footer>
            </div>
        </div>
    );
}

