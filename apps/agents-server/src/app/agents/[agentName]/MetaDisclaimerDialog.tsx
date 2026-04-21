'use client';

import { useId } from 'react';
import { Dialog } from '../../../components/Portal/Dialog';
import { useServerLanguage } from '../../../components/ServerLanguage/ServerLanguageProvider';
import { ThemedMarkdownContent } from '../../../components/ThemePreferences/ThemedMarkdownContent';

/**
 * Props for the blocking META DISCLAIMER dialog shown before chat interaction.
 */
type MetaDisclaimerDialogProps = {
    markdown: string | null;
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
    isAccepting,
    errorMessage,
    onAccept,
    onRetry,
}: MetaDisclaimerDialogProps) {
    const isAcceptButtonDisabled = isAccepting || Boolean(errorMessage) || !markdown;
    const titleId = useId();
    const descriptionId = useId();
    const { t } = useServerLanguage();

    return (
        <Dialog
            onClose={() => undefined}
            isDismissible={false}
            ariaLabelledBy={titleId}
            ariaDescribedBy={descriptionId}
            backdropClassName="bg-slate-900/55 backdrop-blur-[1px]"
            className="mx-4 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 shadow-2xl"
        >
            <header className="border-b border-slate-200 px-6 py-4">
                <h2 id={titleId} className="text-lg font-semibold text-slate-900">
                    {t('metaDisclaimer.title')}
                </h2>
                <p id={descriptionId} className="sr-only">
                    {t('metaDisclaimer.description')}
                </p>
            </header>

            <div className="max-h-[55vh] overflow-y-auto px-6 py-5">
                {errorMessage && (
                    <div className="space-y-3">
                        <p className="text-sm text-red-700">{errorMessage}</p>
                        <button
                            type="button"
                            onClick={onRetry}
                            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            {t('metaDisclaimer.retryLabel')}
                        </button>
                    </div>
                )}

                {!errorMessage && markdown && (
                    <article className="prose prose-slate max-w-none">
                        <ThemedMarkdownContent content={markdown} />
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
                    {isAccepting ? t('metaDisclaimer.savingLabel') : t('metaDisclaimer.agreeLabel')}
                </button>
            </footer>
        </Dialog>
    );
}
