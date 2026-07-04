'use client';

import { CheckCircle2, Server, TriangleAlert } from 'lucide-react';
import { useMemo } from 'react';
import type { ServerLanguageCode } from '../../../languages/ServerLanguageRegistry';
import { buildDeploymentTimeBehindLabel } from './buildDeploymentTimeBehindLabel';
import { formatHumanReadableTimestamp } from './formatHumanReadableTimestamp';
import type { UpdateOverview } from './UpdateOverview';

/**
 * Props for the current deployment summary card.
 *
 * @private type of `<CurrentDeploymentCard/>`
 */
type CurrentDeploymentCardProps = {
    readonly overview: UpdateOverview | null;
    readonly language: ServerLanguageCode;
};

/**
 * Props for rendering one commit summary.
 *
 * @private type of `<CurrentDeploymentCard/>`
 */
type CommitSummaryCardProps = {
    readonly label: string;
    readonly commitSha: string | null;
    readonly shortCommitSha: string | null;
    readonly subject: string | null;
    readonly authoredAt: string | null;
    readonly language: ServerLanguageCode;
};

/**
 * Current-deployment metrics card, including the new commits-behind and time-behind info.
 *
 * @private internal component of `<UpdateClient/>`
 */
export function CurrentDeploymentCard({ overview, language }: CurrentDeploymentCardProps) {
    const driftLabel = useMemo(() => buildDeploymentDriftLabel(overview, language), [overview, language]);

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <Server className="mt-0.5 h-5 w-5 text-blue-600" />
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Current deployment</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        The server currently tracks the{' '}
                        <span className="font-medium">{overview?.currentEnvironment.label || 'Production'}</span>{' '}
                        environment on branch{' '}
                        <span className="font-mono">{overview?.currentEnvironment.branch || 'production'}</span>.
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
                <CommitSummaryCard
                    label="Deployed commit"
                    commitSha={overview?.currentCommitSha ?? null}
                    shortCommitSha={overview?.currentCommitShortSha ?? null}
                    subject={overview?.currentCommitMessage ?? null}
                    authoredAt={overview?.currentCommitDate ?? null}
                    language={language}
                />
                <CommitSummaryCard
                    label="Latest remote commit"
                    commitSha={overview?.latestRemoteCommitSha ?? null}
                    shortCommitSha={overview?.latestRemoteCommitShortSha ?? null}
                    subject={overview?.latestRemoteCommitMessage ?? null}
                    authoredAt={overview?.latestRemoteCommitDate ?? null}
                    language={language}
                />
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Update availability
                    </dt>
                    <dd className="mt-1 flex items-center gap-2 text-slate-900">
                        {overview?.isUpdateAvailable ? (
                            <>
                                <TriangleAlert className="h-4 w-4 text-amber-500" />
                                {driftLabel}
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

            {overview?.repositoryDirectory && (
                <div className="text-xs text-slate-500">
                    Managed repository:
                    <span className="ml-2 font-mono text-slate-700">{overview.repositoryDirectory}</span>
                </div>
            )}
        </div>
    );
}

/**
 * Renders one commit as subject, hash and authored date.
 *
 * @private internal component of `<CurrentDeploymentCard/>`
 */
function CommitSummaryCard({
    label,
    commitSha,
    shortCommitSha,
    subject,
    authoredAt,
    language,
}: CommitSummaryCardProps) {
    const commitHashLabel = commitSha || shortCommitSha || 'Unknown hash';

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-1 text-slate-900">{subject || 'Unknown commit subject'}</dd>
            <div className="mt-2 break-all font-mono text-xs text-slate-600">{commitHashLabel}</div>
            <div className="mt-1 text-xs text-slate-500">{formatHumanReadableTimestamp(authoredAt, language)}</div>
        </div>
    );
}

/**
 * Builds the "behind by …" label combining commits-behind and time-behind info.
 *
 * @param overview - Current overview snapshot.
 * @param language - Active UI language for moment localization.
 * @returns Human-readable label or fallback text.
 *
 * @private function of `<CurrentDeploymentCard/>`
 */
function buildDeploymentDriftLabel(overview: UpdateOverview | null, language: ServerLanguageCode): string {
    if (!overview) {
        return 'New commit available';
    }

    const commitsBehindLabel =
        overview.commitsBehindCount !== null && overview.commitsBehindCount > 0
            ? `${overview.commitsBehindCount} commit${overview.commitsBehindCount === 1 ? '' : 's'} behind`
            : 'New commit available';

    const timeBehindLabel = buildDeploymentTimeBehindLabel(overview, language);
    if (!timeBehindLabel) {
        return commitsBehindLabel;
    }

    return `${commitsBehindLabel} · ${timeBehindLabel}`;
}
