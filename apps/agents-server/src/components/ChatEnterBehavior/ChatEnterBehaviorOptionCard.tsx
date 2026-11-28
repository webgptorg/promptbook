'use client';

import { CornerDownLeft, Pilcrow } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AgentsServerChatEnterBehavior } from '@/src/utils/chatEnterBehaviorSettings';
import { useServerLanguage } from '../ServerLanguage/ServerLanguageProvider';
import { getChatEnterBehaviorPresentation } from './chatEnterBehaviorTranslations';

/**
 * Static icon metadata rendered for one Enter-key behavior option.
 */
type ChatEnterBehaviorPresentation = {
    readonly icon: typeof CornerDownLeft;
};

/**
 * Props for one reusable Enter-key behavior card.
 */
export type ChatEnterBehaviorOptionCardProps = {
    readonly behavior: AgentsServerChatEnterBehavior;
    readonly isSelected?: boolean;
    readonly onClick?: () => void;
    readonly preventMouseFocus?: boolean;
    readonly className?: string;
};

/**
 * Human-friendly labels for both supported Enter-key behaviors.
 */
const CHAT_ENTER_BEHAVIOR_PRESENTATIONS: Record<AgentsServerChatEnterBehavior, ChatEnterBehaviorPresentation> = {
    SEND: {
        icon: CornerDownLeft,
    },
    NEWLINE: {
        icon: Pilcrow,
    },
};

/**
 * Renders one stylized keyboard keycap.
 */
function KeyCap({ children }: { readonly children: ReactNode }) {
    return (
        <span className="inline-flex min-w-[3.1rem] items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-[0.8rem] font-semibold tracking-[0.08em] text-slate-700 shadow-[inset_0_-2px_0_rgba(15,23,42,0.08),0_6px_14px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:shadow-[inset_0_-2px_0_rgba(15,23,42,0.32),0_6px_16px_rgba(2,6,23,0.32)]">
            {children}
        </span>
    );
}

/**
 * Renders one keybinding preview row inside an option card.
 */
function BindingPreviewRow(props: {
    readonly keyLabels: ReadonlyArray<string>;
    readonly actionLabel: string;
    readonly isPrimary: boolean;
}) {
    const { keyLabels, actionLabel, isPrimary } = props;

    return (
        <div
            className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 ${
                isPrimary
                    ? 'border-blue-200 bg-blue-50/80 text-blue-900 dark:border-blue-500/40 dark:bg-blue-500/12 dark:text-blue-100'
                    : 'border-slate-200 bg-white/80 text-slate-700 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200'
            }`}
        >
            <div className="flex flex-wrap items-center gap-2">
                {keyLabels.map((keyLabel, index) => (
                    <div key={`${keyLabel}-${index}`} className="flex items-center gap-2">
                        {index > 0 && <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">+</span>}
                        <KeyCap>{keyLabel}</KeyCap>
                    </div>
                ))}
            </div>
            <span className="text-sm font-semibold">{actionLabel}</span>
        </div>
    );
}

/**
 * Shared card used by the prompt and the dedicated settings page.
 */
export function ChatEnterBehaviorOptionCard(props: ChatEnterBehaviorOptionCardProps) {
    const { behavior, isSelected = false, onClick, preventMouseFocus = false, className } = props;
    const { t } = useServerLanguage();
    const cardPresentation = getChatEnterBehaviorPresentation(t, behavior);
    const { icon: Icon } = CHAT_ENTER_BEHAVIOR_PRESENTATIONS[behavior];
    const sharedClassName = `group w-full rounded-[26px] border p-5 text-left transition duration-150 ${
        isSelected
            ? 'border-blue-300 bg-gradient-to-br from-blue-50 via-white to-sky-50 shadow-[0_18px_45px_rgba(37,99,235,0.18)] dark:border-blue-500/40 dark:from-slate-950 dark:via-blue-950/65 dark:to-slate-900 dark:shadow-[0_20px_48px_rgba(2,6,23,0.5)]'
            : 'border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 shadow-[0_16px_38px_rgba(15,23,42,0.08)] hover:border-slate-300 hover:shadow-[0_18px_42px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900/95 dark:shadow-[0_18px_42px_rgba(2,6,23,0.42)] dark:hover:border-slate-600 dark:hover:from-slate-900 dark:hover:to-slate-900'
    } ${className || ''}`;
    const content = (
        <>
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span
                            className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${
                                isSelected
                                    ? 'bg-blue-600 text-white dark:bg-blue-500 dark:text-white'
                                    : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-200'
                            } shadow-sm`}
                        >
                            <Icon className="h-4 w-4" />
                        </span>
                        <div>
                            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{cardPresentation.title}</p>
                            {isSelected && (
                                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-blue-700 dark:text-blue-200">
                                    {t('chatEnterBehavior.activeLabel')}
                                </p>
                            )}
                        </div>
                    </div>
                    <p className="max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">{cardPresentation.description}</p>
                </div>
            </div>
            <div className="mt-4 space-y-3">
                <BindingPreviewRow
                    keyLabels={['Enter']}
                    actionLabel={cardPresentation.primaryActionLabel}
                    isPrimary
                />
                <BindingPreviewRow
                    keyLabels={['Ctrl', 'Enter']}
                    actionLabel={cardPresentation.secondaryActionLabel}
                    isPrimary={false}
                />
            </div>
        </>
    );

    if (onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                onMouseDown={
                    preventMouseFocus
                        ? (event) => {
                              event.preventDefault();
                          }
                        : undefined
                }
                aria-pressed={isSelected}
                className={sharedClassName}
            >
                {content}
            </button>
        );
    }

    return <article className={sharedClassName}>{content}</article>;
}
