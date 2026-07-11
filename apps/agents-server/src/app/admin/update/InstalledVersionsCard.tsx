'use client';

import { HardDrive, Loader2, Trash2 } from 'lucide-react';
import type { ServerLanguageCode } from '../../../languages/ServerLanguageRegistry';
import { Card } from '../../../components/Homepage/Card';
import { formatHumanReadableTimestamp } from './formatHumanReadableTimestamp';
import type { UpdateClientState } from './useUpdateClientState';
import { UPDATE_PAGE_CARD_CLASS_NAME } from './updatePageCardClassName';

/**
 * Props for the installed versions card.
 *
 * @private type of `<InstalledVersionsCard/>`
 */
type InstalledVersionsCardProps = {
    readonly state: UpdateClientState;
    readonly language: ServerLanguageCode;
};

/**
 * Lists the Agents Server versions installed in the releases directory, marks the currently deployed
 * one, and lets the super admin delete old versions manually to free disk space.
 *
 * @private internal component of `<UpdateClient/>`
 */
export function InstalledVersionsCard({ state, language }: InstalledVersionsCardProps) {
    const { overview } = state;

    if (!overview || overview.installedVersions.length === 0) {
        return null;
    }

    return (
        <Card className={UPDATE_PAGE_CARD_CLASS_NAME}>
            <div className="min-w-0 space-y-4">
                <div className="flex min-w-0 items-start gap-3">
                    <HardDrive className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-slate-900">Installed versions</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Every version keeps its own multi-gigabyte checkout on disk. Old versions beyond the{' '}
                            {overview.garbageCollectionKeepVersionsCount} most recent (configurable via the{' '}
                            <span className="break-all font-mono">AGENTS_SERVER_GC_KEEP_VERSIONS</span> environment
                            variable) are garbage-collected automatically during each self-update, and you can also
                            delete old versions manually here.
                        </p>
                    </div>
                </div>

                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                    {overview.installedVersions.map((installedVersion) => (
                        <li
                            key={installedVersion.name}
                            className="flex min-w-0 items-center justify-between gap-3 px-4 py-3"
                        >
                            <div className="min-w-0">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <span className="break-all font-mono text-sm text-slate-900">
                                        {installedVersion.name}
                                    </span>
                                    {installedVersion.isCurrent && (
                                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                            Current
                                        </span>
                                    )}
                                </div>
                                <div className="mt-1 break-all font-mono text-xs text-slate-500">
                                    {installedVersion.directoryPath}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                    {formatHumanReadableTimestamp(installedVersion.modifiedAt, language)}
                                </div>
                            </div>

                            {!installedVersion.isCurrent && (
                                <button
                                    type="button"
                                    onClick={() => void confirmAndDeleteInstalledVersion(state, installedVersion.name)}
                                    disabled={state.isUpdateRunning || state.deletingVersionName !== null}
                                    className="inline-flex shrink-0 items-center gap-2 rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {state.deletingVersionName === installedVersion.name ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                    Delete
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </Card>
    );
}

/**
 * Asks for confirmation before deleting one old installed version.
 *
 * @param state - Update client state with the delete action.
 * @param versionName - Release directory name to delete.
 *
 * @private function of `<InstalledVersionsCard/>`
 */
async function confirmAndDeleteInstalledVersion(state: UpdateClientState, versionName: string): Promise<void> {
    if (!window.confirm(`Delete the installed Agents Server version ${versionName}? This cannot be undone.`)) {
        return;
    }

    await state.deleteInstalledVersion(versionName);
}
