'use client';

import { useMemo } from 'react';
import type { AgentsServerChatEnterBehavior } from '@/src/utils/chatEnterBehaviorSettings';
import { useServerLanguage } from '../ServerLanguage/ServerLanguageProvider';
import { ChatEnterBehaviorOptionCard } from './ChatEnterBehaviorOptionCard';
import { getChatEnterBehaviorSettingsHelperText } from './chatEnterBehaviorTranslations';

/**
 * Props for the shared three-choice Enter-key preference picker.
 */
export type ChatEnterBehaviorSettingsPanelProps = {
    readonly storedEnterBehavior: AgentsServerChatEnterBehavior | null;
    readonly isLoading: boolean;
    readonly isPersisting: boolean;
    readonly onSelectBehavior: (behavior: AgentsServerChatEnterBehavior | null) => void;
};

/**
 * Shared Enter-key preference picker used by the dedicated settings page and control panel.
 */
export function ChatEnterBehaviorSettingsPanel(props: ChatEnterBehaviorSettingsPanelProps) {
    const { storedEnterBehavior, isLoading, isPersisting, onSelectBehavior } = props;
    const { t } = useServerLanguage();
    const isUndecidedSelected = !isLoading && storedEnterBehavior === null;
    const helperText = useMemo(
        () =>
            getChatEnterBehaviorSettingsHelperText(t, {
                isLoading,
                isPersisting,
                storedEnterBehavior,
            }),
        [isLoading, isPersisting, storedEnterBehavior, t],
    );

    return (
        <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
                <ChatEnterBehaviorOptionCard
                    behavior="SEND"
                    isSelected={!isLoading && storedEnterBehavior === 'SEND'}
                    onClick={() => onSelectBehavior('SEND')}
                    className="h-full"
                />
                <ChatEnterBehaviorOptionCard
                    behavior="NEWLINE"
                    isSelected={!isLoading && storedEnterBehavior === 'NEWLINE'}
                    onClick={() => onSelectBehavior('NEWLINE')}
                    className="h-full"
                />
            </div>

            <button
                type="button"
                onClick={() => onSelectBehavior(null)}
                aria-pressed={isUndecidedSelected}
                className={`w-full rounded-[26px] border px-5 py-4 text-left transition duration-150 ${
                    isUndecidedSelected
                        ? 'border-amber-300 bg-gradient-to-br from-amber-50 via-white to-yellow-50 shadow-[0_18px_45px_rgba(245,158,11,0.16)] dark:border-amber-500/40 dark:from-slate-950 dark:via-amber-950/35 dark:to-slate-900 dark:shadow-[0_20px_48px_rgba(2,6,23,0.48)]'
                        : 'border-slate-200 bg-white/90 shadow-[0_16px_38px_rgba(15,23,42,0.08)] hover:border-slate-300 hover:bg-slate-50/90 hover:shadow-[0_18px_42px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-950/92 dark:hover:border-slate-600 dark:hover:bg-slate-900/95 dark:shadow-[0_18px_42px_rgba(2,6,23,0.42)]'
                }`}
            >
                <div className="flex items-start gap-4">
                    <span
                        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-base font-semibold ${
                            isUndecidedSelected
                                ? 'bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-950'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-200'
                        }`}
                    >
                        ?
                    </span>
                    <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{t('chatEnterBehavior.undecidedTitle')}</p>
                            {isUndecidedSelected && (
                                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-amber-700 dark:text-amber-200">
                                    {t('chatEnterBehavior.activeLabel')}
                                </span>
                            )}
                        </div>
                        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{t('chatEnterBehavior.undecidedDescription')}</p>
                    </div>
                </div>
            </button>

            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-950/88 dark:text-slate-300 dark:shadow-slate-950/30">
                {helperText}
            </div>
        </div>
    );
}
