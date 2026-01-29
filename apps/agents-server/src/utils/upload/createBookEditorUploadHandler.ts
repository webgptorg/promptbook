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
    onProgress?: (progress: number_percent) => void,
) => Promise<string_knowledge_source_content>;

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

    return async (file, onProgress) => {
        console.info('Uploading file', file);

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
            onUploadProgress: (progressEvent) => {
                if (onProgress) {
                    onProgress(progressEvent.percentage / 100);
                }
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
