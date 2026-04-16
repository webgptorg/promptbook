'use client';

import { useState } from 'react';
import {
    ALL_SERVER_BACKUP_SECTION_KEYS,
    SERVER_BACKUP_SECTION_DEFINITIONS,
    type ServerBackupSectionKey,
} from '../../../utils/backup/serverBackupSections';

/**
 * Endpoint serving the selectable server-backup ZIP export.
 */
const SERVER_BACKUP_ENDPOINT = '/api/admin/backups/server';

/**
 * Fallback filename when response headers omit one.
 */
const DEFAULT_BACKUP_FILENAME = 'promptbook-server-backup.zip';

/**
 * Minimal API error payload accepted from failed backup responses.
 */
type BackupErrorPayload = {
    error?: string;
    message?: string;
};

/**
 * Extracts an optional filename from `Content-Disposition`.
 *
 * @param contentDisposition - Raw response header value.
 * @returns Parsed filename or `null` when missing.
 */
function parseFilenameFromContentDisposition(contentDisposition: string | null): string | null {
    if (!contentDisposition) {
        return null;
    }

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
        try {
            return decodeURIComponent(utf8Match[1]);
        } catch {
            return utf8Match[1];
        }
    }

    const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    return plainMatch?.[1] || null;
}

/**
 * Reads a user-facing API error from a failed response.
 *
 * @param response - Failed HTTP response.
 * @returns Friendly message that can be rendered in the UI.
 */
async function resolveBackupErrorMessage(response: Response): Promise<string> {
    const fallbackMessage = `Failed to generate backup (${response.status} ${response.statusText})`;

    try {
        const payload = (await response.json()) as BackupErrorPayload;
        const message = payload.message || payload.error;
        if (message && message.trim().length > 0) {
            return message.trim();
        }
    } catch {
        // Keep fallback when response body is not JSON.
    }

    return fallbackMessage;
}

/**
 * Triggers a browser download from a generated Blob.
 *
 * @param blob - Downloaded backup payload.
 * @param filename - Target filename for the browser save dialog.
 */
function downloadBlob(blob: Blob, filename: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
}

/**
 * Preserves canonical section ordering when toggling client selections.
 *
 * @param selectedSectionKeys - Current selected keys.
 * @returns Ordered section keys ready for rendering and request building.
 */
function orderSelectedSectionKeys(selectedSectionKeys: ReadonlyArray<ServerBackupSectionKey>): Array<ServerBackupSectionKey> {
    const selectedSectionKeySet = new Set(selectedSectionKeys);
    return ALL_SERVER_BACKUP_SECTION_KEYS.filter((sectionKey) => selectedSectionKeySet.has(sectionKey));
}

/**
 * Admin UI for backup exports.
 */
export function BackupClient() {
    const [isDownloading, setIsDownloading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [selectedSectionKeys, setSelectedSectionKeys] = useState<Array<ServerBackupSectionKey>>([
        ...ALL_SERVER_BACKUP_SECTION_KEYS,
    ]);

    const isSelectionEmpty = selectedSectionKeys.length === 0;
    const isFullBackupSelected = selectedSectionKeys.length === ALL_SERVER_BACKUP_SECTION_KEYS.length;
    let downloadButtonLabel = 'Download selected backup';
    if (isDownloading) {
        downloadButtonLabel = 'Generating backup...';
    } else if (isSelectionEmpty) {
        downloadButtonLabel = 'Select at least one section';
    } else if (isFullBackupSelected) {
        downloadButtonLabel = 'Download full backup';
    }

    /**
     * Toggles one backup section in the export selection.
     *
     * @param sectionKey - Section being enabled or disabled.
     */
    const toggleSectionSelection = (sectionKey: ServerBackupSectionKey) => {
        setSelectedSectionKeys((previousSelectedSectionKeys) => {
            const nextSelectedSectionKeys = previousSelectedSectionKeys.includes(sectionKey)
                ? previousSelectedSectionKeys.filter((selectedSectionKey) => selectedSectionKey !== sectionKey)
                : [...previousSelectedSectionKeys, sectionKey];

            return orderSelectedSectionKeys(nextSelectedSectionKeys);
        });
    };

    /**
     * Starts the selected server-backup download flow.
     */
    const handleDownloadBackup = async () => {
        if (isDownloading || isSelectionEmpty) {
            return;
        }

        setIsDownloading(true);
        setErrorMessage(null);

        try {
            const requestUrl = new URL(SERVER_BACKUP_ENDPOINT, window.location.origin);

            for (const sectionKey of selectedSectionKeys) {
                requestUrl.searchParams.append('section', sectionKey);
            }

            const response = await fetch(requestUrl.toString(), { method: 'GET' });
            if (!response.ok) {
                throw new Error(await resolveBackupErrorMessage(response));
            }

            const filename =
                parseFilenameFromContentDisposition(response.headers.get('Content-Disposition')) || DEFAULT_BACKUP_FILENAME;
            const backupBlob = await response.blob();
            downloadBlob(backupBlob, filename);
        } catch (error) {
            const resolvedMessage = error instanceof Error ? error.message : 'Backup export failed.';
            setErrorMessage(resolvedMessage);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mt-20 max-w-3xl">
                <h1 className="text-3xl text-gray-900 font-light">Backups</h1>
                <p className="mt-2 text-sm text-gray-600">
                    Export one ZIP archive containing the selected server data. The backup keeps the existing books export
                    and adds JSON snapshots for the other chosen entities in the same file.
                </p>

                <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-medium text-gray-900">Download server backup</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        All sections are enabled by default, so the standard download is a full backup. The generated ZIP
                        also includes a <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">manifest.json</code> file
                        describing the selected sections.
                    </p>

                    <fieldset className="mt-6" disabled={isDownloading}>
                        <legend className="text-sm font-medium text-gray-900">Include in backup</legend>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            {SERVER_BACKUP_SECTION_DEFINITIONS.map((sectionDefinition) => {
                                const checkboxId = `backup-section-${sectionDefinition.key}`;
                                const isChecked = selectedSectionKeys.includes(sectionDefinition.key);

                                return (
                                    <label
                                        key={sectionDefinition.key}
                                        htmlFor={checkboxId}
                                        className="flex rounded-lg border border-gray-200 p-3 transition-colors hover:border-gray-300 disabled:opacity-70"
                                    >
                                        <input
                                            id={checkboxId}
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => toggleSectionSelection(sectionDefinition.key)}
                                            disabled={isDownloading}
                                            className="mt-1 mr-3"
                                        />
                                        <span className="min-w-0">
                                            <span className="block text-sm font-medium text-gray-900">
                                                {sectionDefinition.label}
                                            </span>
                                            <span className="mt-1 block text-xs leading-5 text-gray-600">
                                                {sectionDefinition.description}
                                            </span>
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </fieldset>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => void handleDownloadBackup()}
                            disabled={isDownloading || isSelectionEmpty}
                            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {downloadButtonLabel}
                        </button>
                        {isDownloading && (
                            <span className="inline-flex items-center gap-2 text-sm text-gray-600" role="status" aria-live="polite">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                                Preparing ZIP archive
                            </span>
                        )}
                    </div>

                    {errorMessage && (
                        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {errorMessage}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
