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
 * Builds the default CDN key used for user-uploaded files.
 *
 * @private shared by browser upload surfaces.
 */
export function buildDefaultUserFileUploadPath(normalizedFilename: string): string {
    return `user/files/${normalizedFilename}`;
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
            const responseBody = request.response as Partial<ServerFileUploadResult> & { error?: string } | null;

            if (request.status >= 200 && request.status < 300 && responseBody?.url) {
                options.onProgress?.(1 as number_percent, {
                    loadedBytes: file.size,
                    totalBytes: file.size,
                });

                resolve(responseBody as ServerFileUploadResult);
                return;
            }

            reject(new Error(responseBody?.error || `File upload failed with HTTP ${request.status}.`));
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
