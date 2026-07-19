'use client';

import { PromptbookFetchError } from '@promptbook-local/core';
import { downloadBlob, parseFilenameFromContentDisposition } from '../download/browserFileDownload';
import { createAgentBookDownloadFilename } from './createAgentBookDownloadFilename';

/**
 * Fallback error shown when the book download endpoint does not provide details.
 */
const DEFAULT_AGENT_BOOK_DOWNLOAD_ERROR_MESSAGE = 'Failed to download agent book.';

/**
 * Options for downloading one agent book in the browser.
 */
type DownloadAgentBookOptions = {
    /**
     * Agent route identifier used by the download endpoint.
     */
    readonly agentIdentifier: string;
    /**
     * Human-readable name used when the server omits a filename header.
     */
    readonly filenameAgentName: string;
};

/**
 * Minimal API error payload accepted from the book download endpoint.
 */
type AgentBookDownloadErrorPayload = {
    readonly error?: string;
    readonly message?: string;
};

/**
 * Creates the stored-book download API path for one agent.
 *
 * @param agentIdentifier - Agent route identifier.
 * @returns Relative API path for downloading the stored book.
 */
function createAgentBookDownloadApiPath(agentIdentifier: string): string {
    return `/agents/${encodeURIComponent(agentIdentifier)}/api/book/download`;
}

/**
 * Reads a user-facing message from a failed book download response.
 *
 * @param response - Failed HTTP response.
 * @returns Friendly error message suitable for a dialog.
 */
async function resolveAgentBookDownloadErrorMessage(response: Response): Promise<string> {
    try {
        const payload = (await response.json()) as AgentBookDownloadErrorPayload;
        const message = payload.message || payload.error;

        if (message && message.trim().length > 0) {
            return message.trim();
        }
    } catch {
        // Keep the fallback message when the error body is not valid JSON.
    }

    return DEFAULT_AGENT_BOOK_DOWNLOAD_ERROR_MESSAGE;
}

/**
 * Downloads the stored `.book` source for one agent.
 *
 * @param options - Agent identifier and fallback filename data.
 * @returns Promise that resolves after the browser download is triggered.
 */
export async function downloadAgentBook({
    agentIdentifier,
    filenameAgentName,
}: DownloadAgentBookOptions): Promise<void> {
    const response = await fetch(createAgentBookDownloadApiPath(agentIdentifier), { method: 'GET' });

    if (!response.ok) {
        throw new PromptbookFetchError(await resolveAgentBookDownloadErrorMessage(response));
    }

    const filename =
        parseFilenameFromContentDisposition(response.headers.get('Content-Disposition')) ||
        createAgentBookDownloadFilename(filenameAgentName);

    downloadBlob(await response.blob(), filename);
}
