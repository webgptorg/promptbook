import type { MutableRefObject } from 'react';
import type { Promisable } from 'type-fest';

// Note: [💞] This module groups the upload types shared across the `useBookEditorMonacoUploads` internals behind a
//       descriptive name, so the file name intentionally does not match a single exported entity.

/**
 * Type describing upload status.
 *
 * @private function of BookEditorMonaco
 */
type UploadStatus = 'queued' | 'uploading' | 'paused' | 'completed' | 'failed';

/**
 * Type describing upload item.
 */
export type UploadItem = {
    readonly id: string;
    readonly fileName: string;
    readonly fileSize: number;
    readonly status: UploadStatus;
    readonly progress: number;
    readonly loadedBytes: number;
    readonly totalBytes: number;
    readonly startedAt: number | null;
    readonly completedAt: number | null;
    readonly errorMessage?: string;
};

/**
 * Type describing upload progress update.
 *
 * @private function of BookEditorMonaco
 */
export type UploadProgressUpdate = {
    readonly progress: number;
    readonly loadedBytes: number;
    readonly totalBytes: number;
};

/**
 * Type describing placeholder entry inserted into Monaco while the file uploads.
 *
 * @private function of BookEditorMonaco
 */
export type UploadPlaceholderEntry = {
    readonly id: string;
    readonly file: File;
    readonly placeholder: string;
};

/**
 * Type describing upload stats.
 */
export type UploadStats = {
    readonly totalFiles: number;
    readonly queuedFiles: number;
    readonly uploadingFiles: number;
    readonly pausedFiles: number;
    readonly failedFiles: number;
    readonly completedFiles: number;
    readonly totalBytes: number;
    readonly uploadedBytes: number;
    readonly progress: number;
    readonly elapsedMs: number;
    readonly speedBytesPerSecond: number;
};

/**
 * Type describing book editor monaco upload progress callback.
 *
 * @private function of BookEditorMonaco
 */
export type BookEditorMonacoUploadProgressCallback = (
    progress: number,
    stats?: {
        loadedBytes: number;
        totalBytes: number;
    },
) => void;

/**
 * Options for book editor monaco upload.
 *
 * @private function of BookEditorMonaco
 */
export type BookEditorMonacoUploadOptions = {
    readonly onProgress?: BookEditorMonacoUploadProgressCallback;
    readonly abortSignal?: AbortSignal;
};

/**
 * Type describing book editor monaco on file upload.
 *
 * @private function of BookEditorMonaco
 */
export type BookEditorMonacoOnFileUpload = (
    file: File,
    options?: BookEditorMonacoUploadOptions | BookEditorMonacoUploadProgressCallback,
) => Promisable<string>;

/**
 * Setter-like updater used by upload state helpers.
 *
 * @private function of BookEditorMonaco
 */
export type SetUploadItems = (updater: (items: UploadItem[]) => UploadItem[]) => void;

/**
 * Single-upload updater used by upload state helpers.
 *
 * @private function of BookEditorMonaco
 */
export type UpdateUploadItem = (uploadId: string, createNextUploadItem: (uploadItem: UploadItem) => UploadItem) => void;

/**
 * Mutable upload items reference shared across upload helpers.
 *
 * @private function of BookEditorMonaco
 */
export type UploadItemsRef = MutableRefObject<UploadItem[]>;

/**
 * Mutable upload file registry reference shared across upload helpers.
 *
 * @private function of BookEditorMonaco
 */
export type UploadFilesRef = MutableRefObject<Map<string, File>>;

/**
 * Mutable Monaco decoration registry reference shared across upload helpers.
 *
 * @private function of BookEditorMonaco
 */
export type UploadDecorationIdsRef = MutableRefObject<Map<string, string>>;

/**
 * Type describing the callback used to enqueue debounced progress updates.
 *
 * @private function of BookEditorMonaco
 */
export type QueueProgressUpdate = (uploadId: string, progress: number, loadedBytes: number, totalBytes: number) => void;
