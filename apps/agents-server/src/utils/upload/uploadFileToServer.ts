'use client';

import type { number_percent } from '@promptbook-local/types';

/**
 * Progress callback invoked during file uploads.
 *
 * @private used by chat, book editor, and admin upload surfaces.
 */
export type FileUploadProgressCallback = (
    progress: number_percent,
    stats?: {
        loadedBytes: number;
        totalBytes: number;
    },
) => void;

/**
 * Options for uploading one file through the Agents Server upload endpoint.
 *
 * @private used by browser upload helpers.
 */
export type ServerFileUploadOptions = {
    file: File;
    pathname: string;
    purpose?: string;
    contentType?: string;
    abortSignal?: AbortSignal;
    onProgress?: FileUploadProgressCallback;
};

/**
 * Response returned by the Agents Server upload endpoint.
 *
 * @private used by browser upload helpers.
 */
export type ServerFileUploadResult = {
    url: string;
    pathname: string;
    contentType: string;
    size: number;
};

/**
 * Error response shape accepted from the upload endpoint.
 *
 * @private used by `uploadFileToServer`
 */
type ServerFileUploadErrorResponse = {
    error?: string | { message?: string };
    message?: string;
};

/**
 * Builds the default CDN key used for user-uploaded files.
 *
 * @private shared by browser upload surfaces.
 */
export function buildDefaultUserFileUploadPath(normalizedFilename: string): string {
    return `user/files/${normalizedFilename}`;
}

/**
 * Resolves the most useful error message from an upload response body.
 *
 * @param responseBody - Parsed JSON response body.
 * @param status - HTTP status code.
 * @returns Error message for the rejected upload promise.
 * @private helper of `uploadFileToServer`
 */
function resolveUploadErrorMessage(
    responseBody: (Partial<ServerFileUploadResult> & ServerFileUploadErrorResponse) | null,
    status: number,
): string {
    if (typeof responseBody?.error === 'string' && responseBody.error) {
        return responseBody.error;
    }

    if (
        typeof responseBody?.error === 'object' &&
        responseBody.error !== null &&
        typeof responseBody.error.message === 'string' &&
        responseBody.error.message
    ) {
        return responseBody.error.message;
    }

    if (typeof responseBody?.message === 'string' && responseBody.message) {
        return responseBody.message;
    }

    return `File upload failed with HTTP ${status}.`;
}

/**
 * Uploads one browser file to `/api/upload` using normal multipart form data.
 *
 * @private shared by browser upload surfaces.
 */
export function uploadFileToServer(options: ServerFileUploadOptions): Promise<ServerFileUploadResult> {
    const { file, pathname, purpose = 'GENERIC_UPLOAD', contentType = file.type || 'application/octet-stream' } = options;

    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        const formData = new FormData();

        formData.append('file', file);
        formData.append('pathname', pathname);
        formData.append('purpose', purpose);
        formData.append('contentType', contentType);

        request.open('POST', '/api/upload');
        request.responseType = 'json';

        request.upload.onprogress = (event) => {
            if (!event.lengthComputable || !options.onProgress) {
                return;
            }

            options.onProgress(event.loaded / event.total, {
                loadedBytes: event.loaded,
                totalBytes: event.total,
            });
        };

        request.onload = () => {
            const responseBody = request.response as
                | (Partial<ServerFileUploadResult> & ServerFileUploadErrorResponse)
                | null;

            if (request.status >= 200 && request.status < 300 && responseBody?.url) {
                options.onProgress?.(1 as number_percent, {
                    loadedBytes: file.size,
                    totalBytes: file.size,
                });

                resolve(responseBody as ServerFileUploadResult);
                return;
            }

            reject(new Error(resolveUploadErrorMessage(responseBody, request.status)));
        };

        request.onerror = () => reject(new Error('File upload failed.'));
        request.onabort = () => reject(new DOMException('File upload was aborted.', 'AbortError'));

        options.abortSignal?.addEventListener(
            'abort',
            () => {
                request.abort();
            },
            { once: true },
        );

        request.send(formData);
    });
}
