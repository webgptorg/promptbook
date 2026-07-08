'use client';

import { RefreshCcw } from 'lucide-react';
import { Card } from '../../../components/Homepage/Card';
import { useServerLanguage } from '../../../components/ServerLanguage/ServerLanguageProvider';
import { AutomaticSelfUpdateConfigurationCard } from './AutomaticSelfUpdateConfigurationCard';
import { CurrentDeploymentCard } from './CurrentDeploymentCard';
import { PendingCommitsCard } from './PendingCommitsCard';
import { TargetEnvironmentCard } from './TargetEnvironmentCard';
import { UpdateJobCard } from './UpdateJobCard';
import { useUpdateClientState } from './useUpdateClientState';

/**
 * Client UI for standalone VPS branch-aware self-updates.
 */
export function UpdateClient() {
    const { language } = useServerLanguage();
    const state = useUpdateClientState();

    return (
        <div className="container mx-auto space-y-6 px-4 py-8">
            <div className="mt-20 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-3xl font-light text-gray-900">Update</h1>
                    <p className="mt-1 max-w-3xl text-sm text-gray-500">
                        Switch the standalone VPS between Live, Preview, Production, LTS, or a custom ref, and update
                        the managed Promptbook checkout with one click.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => void state.loadOverview()}
                    disabled={state.isLoading || state.isStartingUpdate}
                    className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RefreshCcw className={`h-4 w-4 ${state.isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {state.errorMessage && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {state.errorMessage}
                </div>
            )}
            {state.successMessage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {state.successMessage}
                </div>
            )}

            {!state.overview?.isAvailable && state.overview?.unavailableReason && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {state.overview.unavailableReason}
                </div>
            )}

            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <Card className="hover:border-gray-200 hover:shadow-md">
                    <CurrentDeploymentCard overview={state.overview} language={language} />
                </Card>

                <div className="space-y-4">
                    <Card className="hover:border-gray-200 hover:shadow-md">
                        <TargetEnvironmentCard state={state} language={language} />
                    </Card>

                    <Card className="hover:border-gray-200 hover:shadow-md">
                        <AutomaticSelfUpdateConfigurationCard state={state} />
                    </Card>
                </div>
            </div>

            <UpdateJobCard state={state} language={language} />
            <PendingCommitsCard overview={state.overview} language={language} />
        </div>
    );
}
