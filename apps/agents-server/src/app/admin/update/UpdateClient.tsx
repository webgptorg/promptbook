'use client';

import { CheckCircle2, Download, Loader2, RefreshCcw, Rocket, Server, TriangleAlert } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '../../../components/Homepage/Card';

/**
 * Browser-safe environment option returned by the update API.
 */
type UpdateEnvironmentOption = {
    readonly id: string;
    readonly branch: string;
    readonly label: string;
    readonly description: string;
};

/**
 * Browser-safe latest update-job snapshot.
 */
type UpdateJobSnapshot = {
    readonly status: 'idle' | 'running' | 'succeeded' | 'failed';
    readonly pid: number | null;
    readonly targetBranch: string | null;
    readonly targetEnvironment: UpdateEnvironmentOption;
    readonly currentStep: string | null;
    readonly currentCommitSha: string | null;
    readonly targetCommitSha: string | null;
    readonly errorMessage: string | null;
    readonly startedAt: string | null;
    readonly finishedAt: string | null;
    readonly isStale: boolean;
    readonly logTail: string | null;
    readonly logFilePath: string | null;
};

/**
 * Browser-safe self-update overview returned by the super-admin API.
 */
type UpdateOverview = {
    readonly isAvailable: boolean;
    readonly unavailableReason: string | null;
    readonly environments: ReadonlyArray<UpdateEnvironmentOption>;
    readonly currentEnvironment: UpdateEnvironmentOption;
    readonly repositoryDirectory: string | null;
    readonly currentCommitSha: string | null;
    readonly currentCommitShortSha: string | null;
    readonly currentCommitMessage: string | null;
    readonly latestRemoteCommitSha: string | null;
    readonly latestRemoteCommitShortSha: string | null;
    readonly isUpdateAvailable: boolean;
    readonly job: UpdateJobSnapshot;
    readonly error?: string;
};

/**
 * Client UI for standalone VPS branch-aware self-updates.
 */
export function UpdateClient() {
    const [overview, setOverview] = useState<UpdateOverview | null>(null);
    const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isStartingUpdate, setIsStartingUpdate] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    /**
     * Loads the latest self-update overview from the server.
     */
    const loadOverview = useCallback(async (options?: { readonly isSilent?: boolean }): Promise<void> => {
        try {
            if (!options?.isSilent) {
                setIsLoading(true);
            }
            setErrorMessage(null);

            const response = await fetch('/api/admin/update', { cache: 'no-store' });
            const payload = (await response.json()) as UpdateOverview;

            if (!response.ok) {
                throw new Error(payload.error || 'Failed to load the update overview.');
            }

            setOverview(payload);
            setSelectedEnvironmentId((currentSelectedEnvironmentId) =>
                currentSelectedEnvironmentId || payload.currentEnvironment.id,
            );
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load the update overview.');
        } finally {
            if (!options?.isSilent) {
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        void loadOverview();
    }, [loadOverview]);

    useEffect(() => {
        if (overview?.job.status !== 'running') {
            return;
        }

        const interval = window.setInterval(() => {
            void loadOverview({ isSilent: true });
        }, 4000);

        return () => {
            window.clearInterval(interval);
        };
    }, [loadOverview, overview?.job.status]);

    const selectedEnvironment = useMemo(
        () =>
            overview?.environments.find((environment) => environment.id === selectedEnvironmentId) ||
            overview?.currentEnvironment ||
            null,
        [overview, selectedEnvironmentId],
    );
    const isEnvironmentSwitchRequired =
        Boolean(selectedEnvironment) && selectedEnvironment?.id !== overview?.currentEnvironment.id;
    const isUpdateRunning = overview?.job.status === 'running';

    /**
     * Starts one detached update run for the selected environment.
     */
    async function startUpdate(): Promise<void> {
        if (!selectedEnvironment) {
            return;
        }

        try {
            setIsStartingUpdate(true);
            setErrorMessage(null);
            setSuccessMessage(null);

            const response = await fetch('/api/admin/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    environment: selectedEnvironment.id,
                }),
            });
            const payload = (await response.json()) as UpdateOverview;

            if (!response.ok) {
                throw new Error(payload.error || 'Failed to start the update.');
            }

            setOverview(payload);
            setSuccessMessage(
                isEnvironmentSwitchRequired
                    ? `Switched to ${selectedEnvironment.label} and started the standalone VPS update.`
                    : 'Standalone VPS update started.',
            );
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to start the update.');
        } finally {
            setIsStartingUpdate(false);
        }
    }

    return (
        <div className="container mx-auto space-y-6 px-4 py-8">
            <div className="mt-20 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-3xl font-light text-gray-900">Update</h1>
                    <p className="mt-1 max-w-3xl text-sm text-gray-500">
                        Switch the standalone VPS between Production, Live, Preview, and LTS, and update the managed
                        Promptbook checkout with one click.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => void loadOverview()}
                    disabled={isLoading || isStartingUpdate}
                    className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {errorMessage && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {errorMessage}
                </div>
            )}
            {successMessage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {successMessage}
                </div>
            )}

            {!overview?.isAvailable && overview?.unavailableReason && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {overview.unavailableReason}
                </div>
            )}

            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <Card className="hover:border-gray-200 hover:shadow-md">
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <Server className="mt-0.5 h-5 w-5 text-blue-600" />
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Current deployment</h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    The server currently tracks the <span className="font-medium">{overview?.currentEnvironment.label || 'Production'}</span>{' '}
                                    environment on branch <span className="font-mono">{overview?.currentEnvironment.branch || 'production'}</span>.
                                </p>
                            </div>
                        </div>

                        <dl className="grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Branch</dt>
                                <dd className="mt-1 font-mono text-slate-900">
                                    {overview?.currentEnvironment.branch || 'production'}
                                </dd>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Deployed commit
                                </dt>
                                <dd className="mt-1 font-mono text-slate-900">
                                    {overview?.currentCommitShortSha || 'Unknown'}
                                </dd>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Latest remote commit
                                </dt>
                                <dd className="mt-1 font-mono text-slate-900">
                                    {overview?.latestRemoteCommitShortSha || 'Unknown'}
                                </dd>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Update availability
                                </dt>
                                <dd className="mt-1 flex items-center gap-2 text-slate-900">
                                    {overview?.isUpdateAvailable ? (
                                        <>
                                            <TriangleAlert className="h-4 w-4 text-amber-500" />
                                            New commit available
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            Up to date
                                        </>
                                    )}
                                </dd>
                            </div>
                        </dl>

                        {overview?.currentCommitMessage && (
                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Current commit message
                                </div>
                                <div className="mt-1 text-slate-900">{overview.currentCommitMessage}</div>
                            </div>
                        )}

                        {overview?.repositoryDirectory && (
                            <div className="text-xs text-slate-500">
                                Managed repository:
                                <span className="ml-2 font-mono text-slate-700">{overview.repositoryDirectory}</span>
                            </div>
                        )}
                    </div>
                </Card>

                <Card className="hover:border-gray-200 hover:shadow-md">
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Target environment</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Selecting another environment automatically updates the server to the latest commit on
                                that branch.
                            </p>
                        </div>

                        <div className="grid gap-3">
                            {overview?.environments.map((environment) => {
                                const isSelected = environment.id === selectedEnvironment?.id;
                                const isCurrent = environment.id === overview.currentEnvironment.id;

                                return (
                                    <button
                                        key={environment.id}
                                        type="button"
                                        onClick={() => setSelectedEnvironmentId(environment.id)}
                                        disabled={isUpdateRunning || isStartingUpdate}
                                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                                            isSelected
                                                ? 'border-blue-300 bg-blue-50 text-blue-900 shadow-sm'
                                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:shadow-sm'
                                        } disabled:cursor-not-allowed disabled:opacity-60`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="text-sm font-semibold">{environment.label}</div>
                                            {isCurrent && (
                                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                                                    Current
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1 font-mono text-xs">{environment.branch}</div>
                                        <div className="mt-2 text-sm opacity-80">{environment.description}</div>
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={() => void startUpdate()}
                            disabled={
                                !overview?.isAvailable ||
                                !selectedEnvironment ||
                                isUpdateRunning ||
                                isStartingUpdate ||
                                (!isEnvironmentSwitchRequired && !overview?.isUpdateAvailable)
                            }
                            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isStartingUpdate || isUpdateRunning ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : isEnvironmentSwitchRequired ? (
                                <Rocket className="h-4 w-4" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            {isEnvironmentSwitchRequired
                                ? `Switch to ${selectedEnvironment?.label || 'selected environment'} and update`
                                : 'Update to latest commit'}
                        </button>
                    </div>
                </Card>
            </div>

            <Card className="hover:border-gray-200 hover:shadow-md">
                <div className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Update job</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                The update runs in the background so the browser request can finish cleanly before pm2
                                restarts the server.
                            </p>
                        </div>
                        <span
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                                overview?.job.status === 'running'
                                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                                    : overview?.job.status === 'failed'
                                      ? 'border-rose-200 bg-rose-50 text-rose-700'
                                      : overview?.job.status === 'succeeded'
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border-slate-200 bg-slate-50 text-slate-500'
                            }`}
                        >
                            {overview?.job.status || 'idle'}
                        </span>
                    </div>

                    <dl className="grid gap-4 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Target</dt>
                            <dd className="mt-1 text-slate-900">{overview?.job.targetEnvironment.label || 'Production'}</dd>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step</dt>
                            <dd className="mt-1 text-slate-900">{overview?.job.currentStep || 'Idle'}</dd>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Started</dt>
                            <dd className="mt-1 text-slate-900">{formatTimestamp(overview?.job.startedAt)}</dd>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Finished</dt>
                            <dd className="mt-1 text-slate-900">{formatTimestamp(overview?.job.finishedAt)}</dd>
                        </div>
                    </dl>

                    {overview?.job.errorMessage && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {overview.job.errorMessage}
                        </div>
                    )}
                    {overview?.job.isStale && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            The previous background update process stopped unexpectedly. You can start the update again.
                        </div>
                    )}
                    {overview?.job.logFilePath && (
                        <div className="text-xs text-slate-500">
                            Installer log:
                            <span className="ml-2 font-mono text-slate-700">{overview.job.logFilePath}</span>
                        </div>
                    )}
                    <pre className="max-h-[28rem] overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100">
                        {overview?.job.logTail || 'No persisted update log output yet.'}
                    </pre>
                </div>
            </Card>
        </div>
    );
}

/**
 * Formats optional timestamps for the status cards.
 *
 * @param value - ISO timestamp or `null`.
 * @returns Human-friendly timestamp or fallback text.
 */
function formatTimestamp(value: string | null | undefined): string {
    if (!value) {
        return 'Not available';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return `${date.toLocaleString()} (${value})`;
}
