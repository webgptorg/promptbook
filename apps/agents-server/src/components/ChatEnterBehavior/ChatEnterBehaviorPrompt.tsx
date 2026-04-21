'use client';

import { useId } from 'react';
import { useAppearance } from '../Appearance/AppearanceProvider';
import { useServerLanguage } from '../ServerLanguage/ServerLanguageProvider';
import { Dialog } from '../Portal/Dialog';
import { ChatEnterBehaviorOptionCard, type ChatEnterBehaviorOptionCardProps } from './ChatEnterBehaviorOptionCard';

/**
 * Props for the first-run Enter-key preference dialog.
 */
export type ChatEnterBehaviorPromptProps = {
    readonly isOpen: boolean;
    readonly selectedBehavior?: ChatEnterBehaviorOptionCardProps['behavior'];
    readonly onSelectBehavior: (behavior: ChatEnterBehaviorOptionCardProps['behavior']) => void;
    readonly onDismiss: () => void;
};

/**
 * Blocking dialog that lets the user choose what Enter does in chat before continuing.
 */
export function ChatEnterBehaviorPrompt(props: ChatEnterBehaviorPromptProps) {
    const { isOpen, selectedBehavior, onSelectBehavior, onDismiss } = props;
    const { t } = useServerLanguage();
    const { resolvedAppearance } = useAppearance();
    const titleId = useId();
    const descriptionId = useId();
    const isDarkMode = resolvedAppearance === 'dark';

    if (!isOpen) {
        return null;
    }

    return (
        <Dialog
            onClose={onDismiss}
            ariaLabelledBy={titleId}
            ariaDescribedBy={descriptionId}
            className={`h-full w-full overflow-hidden rounded-none border-0 shadow-none sm:h-auto sm:w-[calc(100%-2rem)] sm:max-h-[min(92vh,820px)] sm:max-w-5xl sm:rounded-[34px] sm:border ${
                isDarkMode
                    ? 'bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.2),_transparent_42%),linear-gradient(140deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.97))] sm:border-slate-700 sm:shadow-[0_32px_90px_rgba(2,6,23,0.48)]'
                    : 'bg-[radial-gradient(circle_at_top_left,_rgba(191,219,254,0.45),_transparent_42%),linear-gradient(140deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.97))] sm:border-slate-200 sm:shadow-[0_28px_80px_rgba(15,23,42,0.28)]'
            }`}
        >
            <section aria-live="polite" className="flex h-full flex-col overflow-y-auto">
                <div className="flex flex-1 flex-col gap-5 px-4 pb-6 pt-[max(env(safe-area-inset-top),1rem)] sm:px-6 sm:py-6">
                    <div className="flex flex-col gap-3 sm:gap-4">
                        <p
                            className={`text-[0.72rem] font-semibold uppercase tracking-[0.32em] ${
                                isDarkMode ? 'text-slate-400' : 'text-slate-500'
                            }`}
                        >
                            {t('chatEnterBehavior.sectionEyebrow')}
                        </p>
                        <div className="max-w-2xl space-y-2">
                            <h2
                                id={titleId}
                                className={`text-2xl font-semibold sm:text-[2rem] sm:leading-tight ${
                                    isDarkMode ? 'text-slate-50' : 'text-slate-950'
                                }`}
                            >
                                {t('chatEnterBehavior.promptTitle')}
                            </h2>
                            <p
                                id={descriptionId}
                                className={`text-sm leading-6 sm:text-base ${
                                    isDarkMode ? 'text-slate-300' : 'text-slate-600'
                                }`}
                            >
                                {t('chatEnterBehavior.promptDescription')}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                        <ChatEnterBehaviorOptionCard
                            behavior="SEND"
                            isSelected={selectedBehavior === 'SEND'}
                            onClick={() => onSelectBehavior('SEND')}
                            preventMouseFocus
                            className="h-full"
                        />
                        <ChatEnterBehaviorOptionCard
                            behavior="NEWLINE"
                            isSelected={selectedBehavior === 'NEWLINE'}
                            onClick={() => onSelectBehavior('NEWLINE')}
                            preventMouseFocus
                            className="h-full"
                        />
                    </div>
                </div>

                <div
                    className={`border-t px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4 backdrop-blur sm:px-6 sm:pb-6 ${
                        isDarkMode ? 'border-slate-700 bg-slate-950/65' : 'border-slate-200/80 bg-white/70'
                    }`}
                >
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {t('chatEnterBehavior.promptFooter')}
                        </p>
                        <button
                            type="button"
                            onClick={onDismiss}
                            onMouseDown={(event) => event.preventDefault()}
                            className={`self-start rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition ${
                                isDarkMode
                                    ? 'border-slate-600 bg-slate-900/90 text-slate-100 hover:border-slate-500 hover:text-white'
                                    : 'border-slate-300 bg-white/90 text-slate-700 hover:border-slate-400 hover:text-slate-900'
                            }`}
                        >
                            {t('chatEnterBehavior.notNow')}
                        </button>
                    </div>
                </div>
            </section>
        </Dialog>
    );
}
