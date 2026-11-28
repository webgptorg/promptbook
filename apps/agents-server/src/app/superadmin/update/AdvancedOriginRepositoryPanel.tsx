'use client';

import { ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import type { UpdateOverview } from './UpdateOverview';

/**
 * Props for the advanced upstream repository settings panel.
 *
 * @private type of `<AdvancedOriginRepositoryPanel/>`
 */
type AdvancedOriginRepositoryPanelProps = {
    readonly originRepositoryUrlOverride: string;
    readonly onChange: (nextValue: string) => void;
    readonly overview: UpdateOverview | null;
    readonly isExpanded: boolean;
    readonly onToggleExpanded: () => void;
    readonly isDisabled: boolean;
};

/**
 * Collapsible advanced panel for overriding the upstream repository URL.
 *
 * @private internal component of `<UpdateClient/>`
 */
export function AdvancedOriginRepositoryPanel({
    originRepositoryUrlOverride,
    onChange,
    overview,
    isExpanded,
    onToggleExpanded,
    isDisabled,
}: AdvancedOriginRepositoryPanelProps) {
    return (
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white">
            <button
                type="button"
                onClick={onToggleExpanded}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-700"
            >
                <span className="inline-flex min-w-0 items-center gap-2">
                    <Settings2 className="h-4 w-4 shrink-0" />
                    Advanced
                </span>
                {isExpanded ? (
                    <ChevronUp className="h-4 w-4 shrink-0" />
                ) : (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                )}
            </button>
            {isExpanded && (
                <div className="min-w-0 space-y-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
                    <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Upstream repository URL
                        </span>
                        <input
                            type="url"
                            value={originRepositoryUrlOverride}
                            onChange={(event) => onChange(event.target.value)}
                            disabled={isDisabled}
                            placeholder={overview?.defaultOriginRepositoryUrl || ''}
                            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                    </label>
                    <p className="break-words text-xs text-slate-500">
                        Defaults to{' '}
                        <span className="break-all font-mono">{overview?.defaultOriginRepositoryUrl}</span>. Only
                        change this if you self-host a fork of the original Promptbook repository — the new value is
                        persisted in the standalone VPS <code>.env</code>.
                    </p>
                    {overview && !overview.isOriginRepositoryDefault && (
                        <div className="break-words rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            <strong>Custom origin active:</strong> updates currently pull from{' '}
                            <span className="break-all font-mono">{overview.originRepositoryUrl}</span>.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
