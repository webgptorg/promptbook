'use client';

import { useState } from 'react';

/**
 * Endpoint serving the all-books ZIP backup.
 */
const BOOKS_BACKUP_ENDPOINT = '/api/admin/backups/books';

/**
 * Fallback filename when response headers omit one.
 */
const DEFAULT_BACKUP_FILENAME = 'promptbook-backup.zip';

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
 * Admin UI for backup exports.
 */
export function BackupClient() {
    const [isDownloading, setIsDownloading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    /**
     * Starts the all-books backup download flow.
     */
    const handleDownloadAllBooks = async () => {
        if (isDownloading) {
            return;
        }

        setIsDownloading(true);
        setErrorMessage(null);

        try {
            const response = await fetch(BOOKS_BACKUP_ENDPOINT, { method: 'GET' });
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
                    Export all books as a ZIP archive. The download keeps the same folder structure shown in the Agents
                    Server.
                </p>

                <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-medium text-gray-900">Download all books</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Use this option to create one backup ZIP containing every book in its folder hierarchy.
                    </p>

                    <div className="mt-4 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => void handleDownloadAllBooks()}
                            disabled={isDownloading}
                            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isDownloading ? 'Generating backup...' : 'Download all books'}
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
