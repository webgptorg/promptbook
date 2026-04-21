'use client';

import { BookEditor } from '@promptbook-local/components';
import type { string_book } from '@promptbook-local/types';
import { XIcon } from 'lucide-react';

/**
 * Builds stable Monaco model path for one history preview item.
 *
 * @param versionId - Agent history row id.
 * @returns In-memory Monaco model path dedicated to history preview.
 */
function createHistoryMonacoModelPath(versionId: number): string {
    return `memory://agents-server/book-history/${versionId}.book`;
}

/**
 * One version item prepared for history panel rendering.
 */
export type BookEditorHistoryVersionItem = {
    /**
     * History-row identifier.
     */
    readonly id: number;
    /**
     * Optional human-readable name assigned to this version.
     */
    readonly versionName: string | null;
    /**
     * Human label for the version number.
     */
    readonly versionLabel: string;
    /**
     * Human-readable timestamp label.
     */
    readonly createdAtLabel: string;
    /**
     * Full hash of this snapshot.
     */
    readonly hash: string;
    /**
     * Short hash preview used in the list.
     */
    readonly hashPreview: string;
    /**
     * Full snapshot source content.
     */
    readonly source: string_book;
};

/**
 * Props for the responsive book history panel.
 */
type BookEditorHistoryPanelProps = {
    /**
     * Controls panel visibility.
     */
    readonly isOpen: boolean;
    /**
     * Indicates history list loading state.
     */
    readonly isLoading: boolean;
    /**
     * Optional loading/error message.
     */
    readonly errorMessage: string | null;
    /**
     * Versions to show in the history list.
     */
    readonly versions: ReadonlyArray<BookEditorHistoryVersionItem>;
    /**
     * Currently selected version id.
     */
    readonly selectedVersionId: number | null;
    /**
     * Indicates one restore operation is running.
     */
    readonly isRestoring: boolean;
    /**
     * Whether only named versions should be shown.
     */
    readonly isNamedOnly: boolean;
    /**
     * Current case-insensitive history-name search query.
     */
    readonly nameQuery: string;
    /**
     * Called when the panel should close.
     */
    readonly onClose: () => void;
    /**
     * Called to reload the versions list.
     */
    readonly onRefresh: () => void;
    /**
     * Called to save the current source as a named version.
     */
    readonly onSaveNamedVersion: () => void;
    /**
     * Disables the named-save action while conflicting operation runs.
     */
    readonly isSaveNamedVersionDisabled: boolean;
    /**
     * Called when "named only" filter changes.
     */
    readonly onNamedOnlyChange: (isNamedOnly: boolean) => void;
    /**
     * Called when name-search query changes.
     */
    readonly onNameQueryChange: (nameQuery: string) => void;
    /**
     * Called when one version item is selected.
     */
    readonly onSelectVersion: (versionId: number) => void;
    /**
     * Called when one version should be restored.
     */
    readonly onRestoreVersion: (versionId: number) => void;
};

/**
 * Responsive history panel that mirrors chat-sidebar behavior while splitting versions list and detail view.
 */
export function BookEditorHistoryPanel({
    isOpen,
    isLoading,
    errorMessage,
    versions,
    selectedVersionId,
    isRestoring,
    isNamedOnly,
    nameQuery,
    onClose,
    onRefresh,
    onSaveNamedVersion,
    isSaveNamedVersionDisabled,
    onNamedOnlyChange,
    onNameQueryChange,
    onSelectVersion,
    onRestoreVersion,
}: BookEditorHistoryPanelProps) {
    if (!isOpen) {
        return null;
    }

    const selectedVersion = versions.find((version) => version.id === selectedVersionId) || null;
    const canRestoreSelectedVersion = Boolean(selectedVersion) && !isRestoring;

    return (
        <>
            <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[1px] md:hidden" onClick={onClose} aria-hidden="true" />

            <section
                role="dialog"
                aria-modal="true"
                aria-label="Book version history"
                className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-[960px] flex-col border-l border-slate-200 bg-white shadow-2xl md:relative md:z-0 md:w-[min(56vw,920px)] md:max-w-none md:rounded-2xl md:border md:shadow-lg"
            >
                <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <div>
                        <p className="text-sm font-semibold text-slate-900">Version history</p>
                        <p className="text-xs text-slate-500">Versions and selected version details</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onSaveNamedVersion}
                            className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isSaveNamedVersionDisabled}
                        >
                            Save named version
                        </button>
                        <button
                            type="button"
                            onClick={onRefresh}
                            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isLoading}
                        >
                            Refresh
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-100 md:hidden"
                            aria-label="Close history panel"
                        >
                            <XIcon className="h-4 w-4" />
                        </button>
                    </div>
                </header>

                <div className="flex min-h-0 flex-1">
                    <aside className="w-72 shrink-0 border-r border-slate-200 bg-slate-50/70">
                        <div className="flex h-full min-h-0 flex-col p-2">
                            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Versions</p>
                            <div className="space-y-2 px-2 pb-2">
                                <input
                                    value={nameQuery}
                                    onChange={(event) => onNameQueryChange(event.target.value)}
                                    placeholder="Search by version name"
                                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                />
                                <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                                    <input
                                        type="checkbox"
                                        checked={isNamedOnly}
                                        onChange={(event) => onNamedOnlyChange(event.target.checked)}
                                        className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    Named only
                                </label>
                            </div>
                            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                                {isLoading && <p className="px-2 py-1 text-xs text-slate-500">Loading versions...</p>}

                                {!isLoading && errorMessage && <p className="px-2 py-1 text-xs text-red-600">{errorMessage}</p>}

                                {!isLoading && !errorMessage && versions.length === 0 && (
                                    <p className="px-2 py-1 text-xs text-slate-500">
                                        No history snapshots match current filters.
                                    </p>
                                )}

                                {!isLoading &&
                                    versions.map((version) => {
                                        const isSelected = selectedVersionId === version.id;
                                        const versionTitle = version.versionName || version.versionLabel;
                                        return (
                                            <button
                                                key={version.id}
                                                type="button"
                                                onClick={() => onSelectVersion(version.id)}
                                                className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                                                    isSelected
                                                        ? 'border-blue-300 bg-blue-50 text-blue-800 shadow-sm'
                                                        : 'border-transparent bg-white/90 text-slate-700 hover:border-slate-300 hover:bg-white'
                                                }`}
                                                aria-label={`${versionTitle} ${version.createdAtLabel}`}
                                                title={`${versionTitle} ${version.createdAtLabel}`}
                                            >
                                                <div className="text-xs font-semibold">{versionTitle}</div>
                                                <div className={`mt-0.5 text-[11px] ${isSelected ? 'text-blue-700' : 'text-slate-500'}`}>
                                                    {version.createdAtLabel}
                                                </div>
                                                {version.versionName && (
                                                    <div
                                                        className={`mt-0.5 text-[10px] ${isSelected ? 'text-blue-700' : 'text-slate-500'}`}
                                                    >
                                                        {version.versionLabel}
                                                    </div>
                                                )}
                                                <code
                                                    className={`mt-1 inline-flex rounded px-1.5 py-0.5 text-[10px] ${
                                                        isSelected ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'
                                                    }`}
                                                >
                                                    {version.hashPreview}
                                                </code>
                                            </button>
                                        );
                                    })}
                            </div>
                        </div>
                    </aside>

                    <div className="flex min-h-0 flex-1 flex-col">
                        {selectedVersion ? (
                            <>
                                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {selectedVersion.versionName || selectedVersion.versionLabel}
                                        </p>
                                        <p className="text-xs text-slate-500">{selectedVersion.createdAtLabel}</p>
                                        {selectedVersion.versionName && (
                                            <p className="text-[11px] text-slate-500">{selectedVersion.versionLabel}</p>
                                        )}
                                        <code className="mt-1 inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700">
                                            {selectedVersion.hash}
                                        </code>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onRestoreVersion(selectedVersion.id)}
                                        disabled={!canRestoreSelectedVersion}
                                        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
                                    >
                                        {isRestoring ? 'Restoring...' : 'Restore version'}
                                    </button>
                                </div>

                                <div className="min-h-0 flex-1 overflow-hidden border-t border-slate-200 bg-slate-100 p-3">
                                    <BookEditor
                                        key={selectedVersion.id}
                                        className="h-full w-full"
                                        isBorderRadiusDisabled
                                        height={null}
                                        value={selectedVersion.source}
                                        monacoModelPath={createHistoryMonacoModelPath(selectedVersion.id)}
                                        isReadonly
                                        isUploadButtonShown={false}
                                        isCameraButtonShown={false}
                                        isDownloadButtonShown={false}
                                        isAboutButtonShown={false}
                                        isFullscreenButtonShown={false}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-xs text-slate-500">
                                Select one version to inspect its source.
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </>
    );
}
