'use client';

import { ClipboardCopy, FileDown, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AdminXtermTerminal } from '../../../components/AdminTerminal/AdminXtermTerminal';
import { Card } from '../../../components/Homepage/Card';
import type { ServerLanguageCode } from '../../../languages/ServerLanguageRegistry';
import { downloadBlob, parseFilenameFromContentDisposition } from '../../../utils/download/browserFileDownload';
import { formatHumanReadableTimestamp } from './formatHumanReadableTimestamp';
import { getUpdateJobFailureMessage } from './getUpdateJobFailureMessage';
import { getUpdateJobSuccessMessage } from './getUpdateJobSuccessMessage';
import { UpdateDatabaseMigrationsPanel } from './UpdateDatabaseMigrationsPanel';
import type { UpdateJobSnapshot } from './UpdateOverview';
import type { UpdateClientState } from './useUpdateClientState';

/**
 * Duration (ms) of the transient "Copied!" / "Saved!" feedback shown next to log action buttons.
 */
const UPDATE_LOG_ACTION_FEEDBACK_DURATION_MS = 2500;

/**
 * Default download filename used when the server does not provide one via `Content-Disposition`.
 */
const DEFAULT_UPDATE_LOG_DOWNLOAD_FILENAME = 'self-update.log';

/**
 * Props for the update job card.
 *
 * @private type of `<UpdateJobCard/>`
 */
type UpdateJobCardProps = {
    readonly state: UpdateClientState;
    readonly language: ServerLanguageCode;
};

/**
 * Props for one update job metric.
 *
 * @private type of `<UpdateJobCard/>`
 */
type UpdateJobMetricProps = {
    readonly label: string;
    readonly value: string;
};

/**
 * Update job status value rendered by the job badge.
 *
 * @private type of `<UpdateJobCard/>`
 */
type UpdateJobStatus = UpdateJobSnapshot['status'];

/**
 * Shows the latest standalone VPS update job status and persisted log tail.
 *
 * @private internal component of `<UpdateClient/>`
 */
export function UpdateJobCard({ state, language }: UpdateJobCardProps) {
    const job = state.overview?.job ?? null;
    const jobStatus = job?.status ?? 'idle';

    return (
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
                    <UpdateJobStatusBadge status={jobStatus} />
                </div>

                <UpdateJobSummaryGrid job={job} language={language} />
                <UpdateJobStatusMessage job={job} />
                <UpdateDatabaseMigrationsPanel
                    databaseMigrations={job?.databaseMigrations ?? null}
                    isJobIdle={jobStatus === 'idle'}
                />

                {job?.logFilePath && (
                    <div className="text-xs text-slate-500">
                        Installer log:
                        <span className="ml-2 font-mono text-slate-700">{job.logFilePath}</span>
                    </div>
                )}
                {job?.status === 'failed' && <UpdateJobLogActions />}
                <AdminXtermTerminal
                    terminalId={state.updateTerminalId}
                    output={job?.logTail || ''}
                    emptyState={state.updateTerminalEmptyState}
                    isReadOnly
                    isPlainTextOutput
                    ariaLabel="Standalone VPS update log"
                />
            </div>
        </Card>
    );
}

/**
 * Renders the current update job status badge.
 *
 * @private internal component of `<UpdateJobCard/>`
 */
function UpdateJobStatusBadge({ status }: { readonly status: UpdateJobStatus }) {
    return (
        <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getUpdateJobStatusClassName(
                status,
            )}`}
        >
            {status}
        </span>
    );
}

/**
 * Renders the fixed update job metric grid.
 *
 * @private internal component of `<UpdateJobCard/>`
 */
function UpdateJobSummaryGrid({
    job,
    language,
}: {
    readonly job: UpdateJobSnapshot | null;
    readonly language: ServerLanguageCode;
}) {
    return (
        <dl className="grid gap-4 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-5">
            <UpdateJobMetric label="Target" value={job?.targetEnvironment.label || 'Production'} />
            <UpdateJobMetric label="Trigger" value={formatUpdateJobTrigger(job)} />
            <UpdateJobMetric label="Step" value={job?.currentStep || 'Idle'} />
            <UpdateJobMetric label="Started" value={formatHumanReadableTimestamp(job?.startedAt, language)} />
            <UpdateJobMetric label="Finished" value={formatHumanReadableTimestamp(job?.finishedAt, language)} />
        </dl>
    );
}

/**
 * Formats the update job trigger for the summary grid.
 *
 * @param job - Latest job snapshot.
 * @returns Human-readable trigger label.
 */
function formatUpdateJobTrigger(job: UpdateJobSnapshot | null): string {
    if (!job || job.status === 'idle') {
        return 'Manual';
    }

    return job.trigger === 'automatic' ? 'Automatic' : 'Manual';
}

/**
 * Renders one update job metric.
 *
 * @private internal component of `<UpdateJobCard/>`
 */
function UpdateJobMetric({ label, value }: UpdateJobMetricProps) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-1 text-slate-900">{value}</dd>
        </div>
    );
}

/**
 * Renders the job completion or failure message.
 *
 * @private internal component of `<UpdateJobCard/>`
 */
function UpdateJobStatusMessage({ job }: { readonly job: UpdateJobSnapshot | null }) {
    if (job?.status === 'succeeded') {
        return (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {getUpdateJobSuccessMessage(job)}
            </div>
        );
    }

    if (job?.status === 'failed') {
        return (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {getUpdateJobFailureMessage(job)}
            </div>
        );
    }

    return null;
}

/**
 * Renders the copy / download actions for the persisted standalone VPS self-update log file.
 *
 * Shown when the latest update job failed so the super admin can quickly share the full log with the developers.
 *
 * @private internal component of `<UpdateJobCard/>`
 */
function UpdateJobLogActions() {
    const [actionFeedback, setActionFeedback] = useState<string | null>(null);
    const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
    const [isCopying, setIsCopying] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (feedbackTimeoutRef.current !== null) {
                clearTimeout(feedbackTimeoutRef.current);
                feedbackTimeoutRef.current = null;
            }
        };
    }, []);

    function showActionFeedback(feedbackMessage: string): void {
        if (feedbackTimeoutRef.current !== null) {
            clearTimeout(feedbackTimeoutRef.current);
        }
        setActionFeedback(feedbackMessage);
        setActionErrorMessage(null);
        feedbackTimeoutRef.current = setTimeout(() => {
            setActionFeedback(null);
            feedbackTimeoutRef.current = null;
        }, UPDATE_LOG_ACTION_FEEDBACK_DURATION_MS);
    }

    async function fetchUpdateLogResponse(): Promise<Response> {
        const response = await fetch('/api/admin/update/log', { cache: 'no-store' });
        if (!response.ok) {
            const errorPayload = (await response.json().catch(() => null)) as { readonly error?: string } | null;
            throw new Error(errorPayload?.error || 'Failed to load the self-update log file.');
        }
        return response;
    }

    async function handleCopyLog(): Promise<void> {
        if (isCopying || isDownloading) {
            return;
        }

        try {
            setIsCopying(true);
            setActionErrorMessage(null);
            if (!navigator.clipboard?.writeText) {
                throw new Error('The browser clipboard API is unavailable in this context.');
            }
            const response = await fetchUpdateLogResponse();
            const logContent = await response.text();
            await navigator.clipboard.writeText(logContent);
            showActionFeedback('Self-update log copied to clipboard.');
        } catch (error) {
            setActionErrorMessage(error instanceof Error ? error.message : 'Failed to copy the self-update log.');
        } finally {
            setIsCopying(false);
        }
    }

    async function handleDownloadLog(): Promise<void> {
        if (isCopying || isDownloading) {
            return;
        }

        try {
            setIsDownloading(true);
            setActionErrorMessage(null);
            const response = await fetchUpdateLogResponse();
            const logFilename =
                parseFilenameFromContentDisposition(response.headers.get('Content-Disposition')) ||
                DEFAULT_UPDATE_LOG_DOWNLOAD_FILENAME;
            const logBlob = await response.blob();
            downloadBlob(logBlob, logFilename);
            showActionFeedback(`Saved self-update log as ${logFilename}.`);
        } catch (error) {
            setActionErrorMessage(error instanceof Error ? error.message : 'Failed to download the self-update log.');
        } finally {
            setIsDownloading(false);
        }
    }

    return (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/40 px-4 py-3 text-sm text-rose-700">
            <span className="font-medium">Share the log with the developers:</span>
            <button
                type="button"
                onClick={() => void handleCopyLog()}
                disabled={isCopying || isDownloading}
                className="inline-flex items-center gap-2 rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {isCopying ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                    <ClipboardCopy className="h-3.5 w-3.5" />
                )}
                Copy log
            </button>
            <button
                type="button"
                onClick={() => void handleDownloadLog()}
                disabled={isCopying || isDownloading}
                className="inline-flex items-center gap-2 rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {isDownloading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                    <FileDown className="h-3.5 w-3.5" />
                )}
                Download log
            </button>
            {actionFeedback && (
                <span className="text-xs text-rose-600" role="status" aria-live="polite">
                    {actionFeedback}
                </span>
            )}
            {actionErrorMessage && (
                <span className="text-xs text-rose-700" role="alert">
                    {actionErrorMessage}
                </span>
            )}
        </div>
    );
}

/**
 * Resolves status badge styling for the update job status.
 *
 * @param status - Current update job status.
 * @returns Tailwind class list for the status badge.
 *
 * @private function of `<UpdateJobCard/>`
 */
function getUpdateJobStatusClassName(status: UpdateJobStatus): string {
    if (status === 'running') {
        return 'border-blue-200 bg-blue-50 text-blue-700';
    }

    if (status === 'failed') {
        return 'border-rose-200 bg-rose-50 text-rose-700';
    }

    if (status === 'succeeded') {
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    }

    return 'border-slate-200 bg-slate-50 text-slate-500';
}
