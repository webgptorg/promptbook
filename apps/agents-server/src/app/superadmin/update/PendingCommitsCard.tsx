'use client';

import { GitCommit } from 'lucide-react';
import type { ServerLanguageCode } from '../../../languages/ServerLanguageRegistry';
import { Card } from '../../../components/Homepage/Card';
import { buildDeploymentTimeBehindLabel } from './buildDeploymentTimeBehindLabel';
import { formatHumanReadableTimestamp } from './formatHumanReadableTimestamp';
import type { UpdateOverview } from './UpdateOverview';
import { UPDATE_PAGE_CARD_CLASS_NAME } from './updatePageCardClassName';

/**
 * Props for the pending commits card.
 *
 * @private type of `<PendingCommitsCard/>`
 */
type PendingCommitsCardProps = {
    readonly overview: UpdateOverview | null;
    readonly language: ServerLanguageCode;
};

/**
 * Lists the commits between the deployed checkout and the latest remote commit so the super admin can review what
 * exactly is about to be installed before triggering the self-update.
 *
 * @private internal component of `<UpdateClient/>`
 */
export function PendingCommitsCard({ overview, language }: PendingCommitsCardProps) {
    if (!overview || overview.pendingCommits.length === 0) {
        return null;
    }

    const commitsBehindLabel = getPendingCommitsCountLabel(overview);
    const timeBehindLabel = buildDeploymentTimeBehindLabel(overview, language);

    return (
        <Card className={UPDATE_PAGE_CARD_CLASS_NAME}>
            <div className="min-w-0 space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                        <GitCommit className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                        <div className="min-w-0">
                            <h2 className="text-lg font-semibold text-slate-900">Pending commits</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Commits between the currently deployed checkout and the latest commit on{' '}
                                <span className="break-all font-mono">{overview.currentEnvironment.branch}</span>.
                            </p>
                        </div>
                    </div>
                    <div className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:text-right">
                        <div>{commitsBehindLabel}</div>
                        {timeBehindLabel && <div className="mt-1 normal-case text-slate-400">{timeBehindLabel}</div>}
                    </div>
                </div>

                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                    {overview.pendingCommits.map((pendingCommit) => (
                        <li key={pendingCommit.commitSha} className="px-4 py-3">
                            <div className="break-words text-sm text-slate-900">{pendingCommit.subject}</div>
                            <div className="mt-1 break-all font-mono text-xs text-slate-500">
                                {pendingCommit.commitSha || pendingCommit.shortCommitSha}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                                {formatHumanReadableTimestamp(pendingCommit.authoredAt, language)}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </Card>
    );
}

/**
 * Builds the pending-commit count label shown in the card header.
 *
 * @param overview - Current overview snapshot.
 * @returns Human-readable count label.
 *
 * @private function of `<PendingCommitsCard/>`
 */
function getPendingCommitsCountLabel(overview: UpdateOverview): string {
    if (overview.commitsBehindCount !== null && overview.commitsBehindCount > 0) {
        return `${overview.commitsBehindCount} commit${overview.commitsBehindCount === 1 ? '' : 's'} behind`;
    }

    return `${overview.pendingCommits.length} commit${overview.pendingCommits.length === 1 ? '' : 's'} pending`;
}
