'use client';

import { upload } from '@vercel/blob/client';
import type { number_percent, string_knowledge_source_content } from '@promptbook-local/types';
import { getSafeCdnPath } from '../cdn/utils/getSafeCdnPath';
import { normalizeUploadFilename } from '../normalization/normalizeUploadFilename';

/**
 * Progress callback invoked during file uploads.
 *
 * @private used by chat and book editors.
 */
export type FileUploadProgressCallback = (
    progress: number_percent,
    stats?: {
        loadedBytes: number;
        totalBytes: number;
    },
) => void;

/**
 * Optional upload configuration such as progress reporting or cancellation.
 *
 * @private used by chat and book editors.
 */
export type FileUploadOptions = {
    onProgress?: FileUploadProgressCallback;
    abortSignal?: AbortSignal;
};

/**
 * Normalizes the various overloads that allow passing just a progress callback.
 */
const normalizeUploadOptions = (
    optionsOrOnProgress?: FileUploadOptions | FileUploadProgressCallback,
): FileUploadOptions => {
    if (typeof optionsOrOnProgress === 'function') {
        return {
            onProgress: optionsOrOnProgress,
            abortSignal: (optionsOrOnProgress as FileUploadProgressCallback & { abortSignal?: AbortSignal })
                .abortSignal,
        };
    }

    return optionsOrOnProgress ?? {};
};

/**
 * Preconditions for building upload paths.
 *
 * @private
 */
type UploadPathBuilder = (normalizedFilename: string, pathPrefix: string) => string;

const buildDefaultUserFilePath: UploadPathBuilder = (normalizedFilename, pathPrefix) =>
    pathPrefix ? `${pathPrefix}/user/files/${normalizedFilename}` : `user/files/${normalizedFilename}`;

/**
 * Configuration of the shared upload handler.
 *
 * @private
 */
type SharedUploadHandlerConfig = {
    purpose?: string;
    pathBuilder?: UploadPathBuilder;
    returnShortUrl?: boolean;
    shortUrlPrefix?: string;
};

const DEFAULT_SHORT_URL_PREFIX = 'https://ptbk.io/k/';

/**
 * Upload handler that normalizes the filename, uploads via `/api/upload`, and optionally returns a short URL.
 *
 * @private
 */
export function createFileUploadHandler<ReturnType extends string = string>(
    config: SharedUploadHandlerConfig = {},
): (file: File, optionsOrOnProgress?: FileUploadOptions | FileUploadProgressCallback) => Promise<ReturnType> {
    const {
        purpose = 'GENERIC_UPLOAD',
        pathBuilder = buildDefaultUserFilePath,
        returnShortUrl = false,
        shortUrlPrefix = DEFAULT_SHORT_URL_PREFIX,
    } = config;

    return async (file, optionsOrOnProgress) => {
        const { onProgress, abortSignal } = normalizeUploadOptions(optionsOrOnProgress);
        const pathPrefix = process.env.NEXT_PUBLIC_CDN_PATH_PREFIX || '';
        const normalizedFilename = normalizeUploadFilename(file.name);
        const uploadPath = pathBuilder(normalizedFilename, pathPrefix);
        const safeUploadPath = getSafeCdnPath({ pathname: uploadPath });

        const blob = await upload(safeUploadPath, file, {
            access: 'public',
            handleUploadUrl: '/api/upload',
            clientPayload: JSON.stringify({
                purpose,
                contentType: file.type || 'application/octet-stream',
            }),
            abortSignal,
            onUploadProgress: (progressEvent) => {
                onProgress?.(progressEvent.percentage / 100, {
                    loadedBytes: progressEvent.loaded,
                    totalBytes: progressEvent.total,
                });
            },
        });

        if (returnShortUrl && process.env.NEXT_PUBLIC_CDN_PUBLIC_URL) {
            const slashIndex = uploadPath.lastIndexOf('/');
            const directoryPath = slashIndex === -1 ? '' : `${uploadPath.slice(0, slashIndex + 1)}`;
            const longUrlPrefix = `${process.env.NEXT_PUBLIC_CDN_PUBLIC_URL}/${directoryPath}`;
            const shortUrl = blob.url.split(longUrlPrefix).join(shortUrlPrefix);
            return shortUrl as ReturnType;
        }

        return blob.url as ReturnType;
    };
}

/**
 * Handler signature expected by the BookEditor component.
 */
export type BookEditorUploadHandler = (
    file: File,
    optionsOrOnProgress?: BookEditorUploadOptions | FileUploadProgressCallback,
) => Promise<string_knowledge_source_content>;

/**
 * Progress callback for the BookEditor helper.
 */
export type BookEditorUploadProgressCallback = FileUploadProgressCallback;

/**
 * Options exposed by the BookEditor helper.
 */
export type BookEditorUploadOptions = {
    onProgress?: BookEditorUploadProgressCallback;
    abortSignal?: AbortSignal;
    purpose?: string;
};

/**
 * Builds `BookEditor` upload handler reusing the shared logic and returning short URLs.
 */
export function createBookEditorUploadHandler(
    options: BookEditorUploadOptions = {},
): BookEditorUploadHandler {
    const { purpose = 'KNOWLEDGE' } = options;
    const handler = createFileUploadHandler<string_knowledge_source_content>({
        purpose,
        returnShortUrl: true,
        shortUrlPrefix: DEFAULT_SHORT_URL_PREFIX,
    });

    return async (file, optionsOrOnProgress) => handler(file, optionsOrOnProgress);
}

/**
 * Default BookEditor handler.
 */
export const bookEditorUploadHandler = createBookEditorUploadHandler();

/**
 * Handler used by chat attachments so agents can access uploaded files.
 */
export const chatFileUploadHandler = createFileUploadHandler({
    purpose: 'CHAT_ATTACHMENT',
    returnShortUrl: true,
    shortUrlPrefix: DEFAULT_SHORT_URL_PREFIX,
});
