'use client';

import { CalendarClock, Loader2, Save } from 'lucide-react';
import { CronJobConfiguration } from '../../../components/CronJobConfiguration/CronJobConfiguration';
import type { UpdateClientState } from './useUpdateClientState';

/**
 * Props for the automatic self-update configuration card.
 *
 * @private type of `<AutomaticSelfUpdateConfigurationCard/>`
 */
type AutomaticSelfUpdateConfigurationCardProps = {
    readonly state: UpdateClientState;
};

/**
 * Branch-aware automatic self-update configuration persisted into the VPS `.env` file.
 *
 * @private internal component of `<UpdateClient/>`
 */
export function AutomaticSelfUpdateConfigurationCard({ state }: AutomaticSelfUpdateConfigurationCardProps) {
    const isDisabled = state.isLoading || state.isSavingAutomaticConfiguration || state.isUpdateRunning;
    const environments = (state.overview?.environments ?? []).filter((environment) => !environment.isCustom);

    return (
        <div className="min-w-0 space-y-4">
            <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-slate-900">Automatic self-update</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Scheduled checks use the selected branch and the cron interval stored in the VPS{' '}
                        <code>.env</code>.
                    </p>
                </div>
                <CalendarClock className="mt-1 h-5 w-5 shrink-0 text-slate-400" />
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800">
                <input
                    type="checkbox"
                    checked={state.automaticConfigurationDraft.isEnabled}
                    onChange={(event) => state.changeAutomaticUpdateEnabled(event.target.checked)}
                    disabled={isDisabled}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                />
                Enable automatic updates
            </label>

            <div className="grid min-w-0 gap-3">
                <label className="block min-w-0 text-sm font-medium text-slate-700">
                    Branch
                    <select
                        value={state.automaticConfigurationDraft.environmentId}
                        onChange={(event) => state.selectAutomaticUpdateEnvironment(event.target.value)}
                        disabled={isDisabled}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                    >
                        {environments.map((environment) => (
                            <option key={environment.id} value={environment.id}>
                                {environment.label} ({environment.branch})
                            </option>
                        ))}
                    </select>
                </label>

                <CronJobConfiguration
                    label="Cron interval"
                    value={state.automaticConfigurationDraft.cronExpression}
                    onChange={state.changeAutomaticUpdateCronExpression}
                    isDisabled={isDisabled}
                    helperText="Pick a common schedule or edit the cron expression directly."
                />
            </div>

            <button
                type="button"
                onClick={() => void state.saveAutomaticConfiguration()}
                disabled={isDisabled || !state.isAutomaticConfigurationChanged}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {state.isSavingAutomaticConfiguration ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Save className="h-4 w-4" />
                )}
                Save automatic configuration
            </button>
        </div>
    );
}
