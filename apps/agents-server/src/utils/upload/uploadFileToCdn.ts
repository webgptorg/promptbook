'use client';

import { upload } from '@vercel/blob/client';
import type { number_percent } from '@promptbook-local/types';

/**
 * Response returned by both supported browser upload strategies.
 *
 * @private used by Agents Server upload helpers.
 */
export type UploadedCdnFile = {
    readonly url: string;
    readonly pathname?: string;
    readonly contentType?: string;
};

/**
 * Configuration for one browser-side CDN upload.
 *
 * @private used by Agents Server upload helpers.
 */
export type UploadFileToCdnOptions = {
    readonly pathname: string;
    readonly file: File;
    readonly purpose?: string;
    readonly contentType?: string;
    readonly onProgress?: (
        progress: number_percent,
        stats?: {
            loadedBytes: number;
            totalBytes: number;
        },
    ) => void;
    readonly abortSignal?: AbortSignal;
};

/**
 * Normalized upload provider names understood by the browser upload helper.
 *
 * @private used by Agents Server upload helpers.
 */
type ClientCdnStorageProvider = 'vercel-blob' | 's3';

/**
 * Default short URL prefix used by the historical Vercel Blob CDN setup.
 *
 * @private used by Agents Server upload helpers.
 */
const DEFAULT_SHORT_URL_PREFIX = 'https://ptbk.io/k/';

/**
 * Resolves the configured upload provider for browser-initiated uploads.
 *
 * @private used by Agents Server upload helpers.
 */
function resolveClientCdnStorageProvider(): ClientCdnStorageProvider {
    const provider = (process.env.NEXT_PUBLIC_CDN_STORAGE_PROVIDER || '').trim().toLowerCase();

    if (provider === 's3' || provider === 'self-contained-s3' || provider === 'external-s3') {
        return 's3';
    }

    return 'vercel-blob';
}

/**
 * Resolves the short URL prefix, keeping the legacy default only for Vercel Blob installs.
 *
 * @private used by Agents Server upload helpers.
 */
function resolveShortUrlPrefix(): string | null {
    const configuredPrefix = (process.env.NEXT_PUBLIC_CDN_SHORT_URL_PREFIX || '').trim();
    if (configuredPrefix) {
        return configuredPrefix;
    }

    if (resolveClientCdnStorageProvider() === 'vercel-blob') {
        return DEFAULT_SHORT_URL_PREFIX;
    }

    return null;
}

/**
 * Converts a canonical CDN URL to a configured short URL when the deployment supports it.
 *
 * @private used by Agents Server upload helpers.
 */
export function createShortCdnUrl(fileUrl: string, uploadPath: string): string | null {
    const shortUrlPrefix = resolveShortUrlPrefix();
    const cdnPublicUrl = (process.env.NEXT_PUBLIC_CDN_PUBLIC_URL || '').trim();

    if (!shortUrlPrefix || !cdnPublicUrl) {
        return null;
    }

    const slashIndex = uploadPath.lastIndexOf('/');
    const directoryPath = slashIndex === -1 ? '' : `${uploadPath.slice(0, slashIndex + 1)}`;
    const longUrlPrefix = `${cdnPublicUrl.replace(/\/+$/, '')}/${directoryPath.replace(/^\/+/, '')}`;

    return fileUrl.split(longUrlPrefix).join(shortUrlPrefix);
}

/**
 * Uploads one file through the configured CDN provider.
 *
 * Vercel Blob still uses its direct client protocol. S3-compatible storage uses
 * the local upload route so installed servers do not expose S3 credentials.
 *
 * @private used by Agents Server upload helpers.
 */
export async function uploadFileToCdn(options: UploadFileToCdnOptions): Promise<UploadedCdnFile> {
    if (resolveClientCdnStorageProvider() === 's3') {
        return uploadFileToS3BackedCdn(options);
    }

    return upload(options.pathname, options.file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        clientPayload: JSON.stringify({
            purpose: options.purpose || 'GENERIC_UPLOAD',
            contentType: options.contentType || options.file.type || 'application/octet-stream',
        }),
        abortSignal: options.abortSignal,
        onUploadProgress: (progressEvent) => {
            options.onProgress?.(progressEvent.percentage / 100, {
                loadedBytes: progressEvent.loaded,
                totalBytes: progressEvent.total,
            });
        },
    });
}

/**
 * Uploads one file to the server-mediated S3 upload endpoint.
 *
 * @private used by Agents Server upload helpers.
 */
function uploadFileToS3BackedCdn(options: UploadFileToCdnOptions): Promise<UploadedCdnFile> {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        const formData = new FormData();

        formData.append('pathname', options.pathname);
        formData.append(
            'clientPayload',
            JSON.stringify({
                purpose: options.purpose || 'GENERIC_UPLOAD',
                contentType: options.contentType || options.file.type || 'application/octet-stream',
            }),
        );
        formData.append('file', options.file);

        const abortUpload = () => request.abort();
        options.abortSignal?.addEventListener('abort', abortUpload, { once: true });

        request.upload.onprogress = (event) => {
            if (!event.lengthComputable) {
                return;
            }

            options.onProgress?.(event.loaded / event.total, {
                loadedBytes: event.loaded,
                totalBytes: event.total,
            });
        };

        request.onload = () => {
            options.abortSignal?.removeEventListener('abort', abortUpload);

            if (request.status < 200 || request.status >= 300) {
                reject(new Error(request.responseText || `Upload failed with status ${request.status}`));
                return;
            }

            try {
                resolve(JSON.parse(request.responseText) as UploadedCdnFile);
            } catch (error) {
                reject(error);
            }
        };

        request.onerror = () => {
            options.abortSignal?.removeEventListener('abort', abortUpload);
            reject(new Error('Upload failed before the server returned a response.'));
        };

        request.onabort = () => {
            options.abortSignal?.removeEventListener('abort', abortUpload);
            reject(new DOMException('Upload was aborted.', 'AbortError'));
        };

        request.open('POST', '/api/upload');
        request.send(formData);
    });
}
