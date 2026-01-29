'use client';

import { upload } from '@vercel/blob/client';
import type { number_percent, string_knowledge_source_content } from '@promptbook-local/types';
import { getSafeCdnPath } from '../cdn/utils/getSafeCdnPath';
import { normalizeUploadFilename } from '../normalization/normalizeUploadFilename';

/**
 * Upload handler signature expected by the BookEditor component.
 */
export type BookEditorUploadHandler = (
    file: File,
    optionsOrOnProgress?: BookEditorUploadOptions | BookEditorUploadProgressCallback,
) => Promise<string_knowledge_source_content>;

/**
 * Upload progress callback for BookEditor uploads.
 */
export type BookEditorUploadProgressCallback = (
    progress: number_percent,
    stats?: {
        loadedBytes: number;
        totalBytes: number;
    },
) => void;

/**
 * Options for BookEditor uploads.
 */
export type BookEditorUploadOptions = {
    /**
     * Progress callback invoked during upload.
     */
    onProgress?: BookEditorUploadProgressCallback;

    /**
     * Optional abort signal for canceling an upload.
     */
    abortSignal?: AbortSignal;
};

/**
 * Normalizes the upload options input into a single shape.
 */
const normalizeUploadOptions = (
    optionsOrOnProgress?: BookEditorUploadOptions | BookEditorUploadProgressCallback,
): BookEditorUploadOptions => {
    if (typeof optionsOrOnProgress === 'function') {
        return {
            onProgress: optionsOrOnProgress,
            abortSignal: (optionsOrOnProgress as BookEditorUploadProgressCallback & { abortSignal?: AbortSignal })
                .abortSignal,
        };
    }

    return optionsOrOnProgress ?? {};
};

/**
 * Configuration options for creating a BookEditor upload handler.
 */
export type BookEditorUploadHandlerOptions = {
    /**
     * Purpose metadata stored alongside uploaded files.
     *
     * @default 'KNOWLEDGE'
     */
    purpose?: string;
};

/**
 * Builds a BookEditor upload handler that stores files in the user files CDN area and
 * returns a shortened URL when possible.
 */
export function createBookEditorUploadHandler(
    options: BookEditorUploadHandlerOptions = {},
): BookEditorUploadHandler {
    const { purpose = 'KNOWLEDGE' } = options;

    return async (file, optionsOrOnProgress) => {
        console.info('Uploading file', file);

        const { onProgress, abortSignal } = normalizeUploadOptions(optionsOrOnProgress);
        const pathPrefix = process.env.NEXT_PUBLIC_CDN_PATH_PREFIX || '';
        const normalizedFilename = normalizeUploadFilename(file.name);
        const uploadPath = pathPrefix
            ? `${pathPrefix}/user/files/${normalizedFilename}`
            : `user/files/${normalizedFilename}`;
        const safeUploadPath = getSafeCdnPath({ pathname: uploadPath });

        const blob = await upload(safeUploadPath, file, {
            access: 'public',
            handleUploadUrl: '/api/upload',
            clientPayload: JSON.stringify({
                purpose,
                contentType: file.type,
            }),
            abortSignal,
            onUploadProgress: (progressEvent) => {
                onProgress?.(progressEvent.percentage / 100, {
                    loadedBytes: progressEvent.loaded,
                    totalBytes: progressEvent.total,
                });
            },
        });

        const fileUrl = blob.url;
        const longUrlPrefix = `${process.env.NEXT_PUBLIC_CDN_PUBLIC_URL!}/${process.env
            .NEXT_PUBLIC_CDN_PATH_PREFIX!}/user/files/`;
        const shortUrlPrefix = 'https://ptbk.io/k/';
        const shortFileUrl = fileUrl.split(longUrlPrefix).join(shortUrlPrefix);

        console.log('File uploaded', {
            longUrlPrefix,
            shortUrlPrefix,
            fileUrl,
            shortFileUrl,
            file,
            blob,
        });

        return shortFileUrl;
    };
}

/**
 * Default upload handler for BookEditor knowledge uploads.
 */
export const bookEditorUploadHandler = createBookEditorUploadHandler();
