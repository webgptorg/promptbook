import { useCallback, useEffect, useRef } from 'react';
import { DEFAULT_MAX_CONCURRENT_UPLOADS } from '../../../config';
import type { BookEditorMonacoOnFileUpload, BookEditorMonacoUploadProgressCallback, QueueProgressUpdate, SetUploadItems, UpdateUploadItem, UploadFilesRef, UploadItem, UploadItemsRef, UploadProgressUpdate } from './bookEditorMonacoUploadTypes';
import { clearScheduledTimer } from './clearScheduledTimer';
import { replaceUploadItemById } from './useBookEditorMonacoUploadItemsState';

/**
 * Type describing callback-shaped upload options passed to `onFileUpload`.
 *
 * @private function of BookEditorMonaco
 */
type UploadRequestOptions = BookEditorMonacoUploadProgressCallback & {
    onProgress?: BookEditorMonacoUploadProgressCallback;
    abortSignal?: AbortSignal;
};

/**
 * Recognizes abort signals that should pause but not mark uploads as failed.
 *
 * @private function of BookEditorMonaco
 */
const isAbortError = (error: unknown) => {
    if (!error) {
        return false;
    }

    if (typeof error === 'object' && 'name' in error) {
        return (error as { name?: string }).name === 'AbortError';
    }

    const message = error instanceof Error ? error.message : String(error);
    return message.toLowerCase().includes('abort');
};

/**
 * Normalizes progress payloads so uploads can work with callbacks that omit byte stats.
 *
 * @private function of BookEditorMonaco
 */
function createUploadProgressUpdate(
    fileSize: number,
    progress: number,
    stats?: {
        loadedBytes: number;
        totalBytes: number;
    },
): UploadProgressUpdate {
    const loadedBytes = stats?.loadedBytes ?? Math.round(Math.min(1, progress) * (fileSize || 0));
    const totalBytes = stats?.totalBytes ?? (fileSize || loadedBytes);

    return {
        progress,
        loadedBytes,
        totalBytes,
    };
}

/**
 * Creates the callback-shaped upload options object expected by legacy callers.
 *
 * @private function of BookEditorMonaco
 */
function createUploadRequestOptions(
    file: File,
    uploadId: string,
    abortSignal: AbortSignal,
    queueProgressUpdate: QueueProgressUpdate,
): UploadRequestOptions {
    const uploadRequestOptions = ((progress, stats) => {
        const progressUpdate = createUploadProgressUpdate(file.size, progress, stats);
        queueProgressUpdate(uploadId, progressUpdate.progress, progressUpdate.loadedBytes, progressUpdate.totalBytes);
    }) as UploadRequestOptions;

    uploadRequestOptions.onProgress = uploadRequestOptions;
    uploadRequestOptions.abortSignal = abortSignal;

    return uploadRequestOptions;
}

/**
 * Extracts the user-facing error message for a failed upload.
 *
 * @private function of BookEditorMonaco
 */
function getUploadErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Upload failed';
}

/**
 * Checks whether an upload item is currently eligible to start.
 *
 * @private function of BookEditorMonaco
 */
function isUploadStartable(uploadItem: UploadItem | undefined): uploadItem is UploadItem {
    return Boolean(uploadItem && uploadItem.status !== 'uploading' && uploadItem.status !== 'completed');
}

/**
 * Selects queued uploads that can start immediately based on remaining capacity.
 *
 * @private function of BookEditorMonaco
 */
function getQueuedUploadIds(uploadItems: ReadonlyArray<UploadItem>, availableSlots: number): Array<string> {
    if (availableSlots <= 0) {
        return [];
    }

    return uploadItems
        .filter((uploadItem) => uploadItem.status === 'queued')
        .slice(0, availableSlots)
        .map(({ id }) => id);
}

/**
 * Props for upload queue processing and pause/resume handling.
 *
 * @private function of BookEditorMonaco
 */
type UseBookEditorMonacoUploadQueueProps = {
    readonly onFileUpload?: BookEditorMonacoOnFileUpload;
    readonly uploadItemsRef: UploadItemsRef;
    readonly uploadFilesRef: UploadFilesRef;
    readonly queueProgressUpdate: QueueProgressUpdate;
    readonly queueEditorReplacement: (uploadId: string, replacementText: string) => void;
    readonly setUploadItems: SetUploadItems;
    readonly updateUploadItem: UpdateUploadItem;
};

/**
 * Manages upload concurrency, retries, pausing and completion side effects.
 *
 * @private function of BookEditorMonaco
 */
export function useBookEditorMonacoUploadQueue({
    onFileUpload,
    uploadItemsRef,
    uploadFilesRef,
    queueProgressUpdate,
    queueEditorReplacement,
    setUploadItems,
    updateUploadItem,
}: UseBookEditorMonacoUploadQueueProps) {
    const uploadControllersRef = useRef<Map<string, AbortController>>(new Map());
    const uploadQueueTimerRef = useRef<number | null>(null);
    const processUploadQueueRef = useRef<() => void>(() => undefined);

    const queueUploadProcessing = useCallback(() => {
        if (uploadQueueTimerRef.current !== null) {
            return;
        }

        uploadQueueTimerRef.current = window.setTimeout(() => {
            uploadQueueTimerRef.current = null;
            processUploadQueueRef.current();
        }, 0);
    }, []);

    const markUploadAsUploading = useCallback(
        (uploadId: string) => {
            updateUploadItem(uploadId, (uploadItem) => ({
                ...uploadItem,
                status: 'uploading',
                startedAt: uploadItem.startedAt ?? Date.now(),
                errorMessage: undefined,
            }));
        },
        [updateUploadItem],
    );

    const markUploadAsPaused = useCallback(
        (uploadId: string) => {
            updateUploadItem(uploadId, (uploadItem) => ({
                ...uploadItem,
                status: 'paused',
                errorMessage: undefined,
            }));
        },
        [updateUploadItem],
    );

    const markUploadAsFailed = useCallback(
        (uploadId: string, errorMessage: string) => {
            updateUploadItem(uploadId, (uploadItem) => ({
                ...uploadItem,
                status: 'failed',
                errorMessage,
            }));
        },
        [updateUploadItem],
    );

    const markUploadAsCompleted = useCallback(
        (uploadId: string, fileSize: number) => {
            updateUploadItem(uploadId, (uploadItem) => ({
                ...uploadItem,
                status: 'completed',
                progress: 1,
                loadedBytes: uploadItem.totalBytes || fileSize,
                completedAt: Date.now(),
            }));
        },
        [updateUploadItem],
    );

    const resetUploadForRetry = useCallback(
        (uploadId: string) => {
            updateUploadItem(uploadId, (uploadItem) => ({
                ...uploadItem,
                status: 'queued',
                progress: 0,
                loadedBytes: 0,
                startedAt: null,
                completedAt: null,
                errorMessage: undefined,
            }));
        },
        [updateUploadItem],
    );

    const pauseQueuedUpload = useCallback(
        (uploadId: string) => {
            setUploadItems((currentUploadItems) =>
                replaceUploadItemById(currentUploadItems, uploadId, (uploadItem) =>
                    uploadItem.status === 'queued'
                        ? {
                              ...uploadItem,
                              status: 'paused',
                          }
                        : uploadItem,
                ),
            );
        },
        [setUploadItems],
    );

    const completeUpload = useCallback(
        (uploadId: string, file: File, url: string) => {
            queueProgressUpdate(uploadId, 1, file.size, file.size);
            queueEditorReplacement(uploadId, `KNOWLEDGE ${url}`);
            markUploadAsCompleted(uploadId, file.size);
        },
        [markUploadAsCompleted, queueEditorReplacement, queueProgressUpdate],
    );

    const failUpload = useCallback(
        (uploadId: string, file: File, error: unknown) => {
            console.error(`File upload failed for ${file.name}:`, error);
            queueEditorReplacement(uploadId, `KNOWLEDGE ❌ Failed to upload ${file.name}`);
            markUploadAsFailed(uploadId, getUploadErrorMessage(error));
        },
        [markUploadAsFailed, queueEditorReplacement],
    );

    const startUpload = useCallback(
        async (uploadId: string) => {
            if (!onFileUpload) {
                return;
            }

            const file = uploadFilesRef.current.get(uploadId);
            if (!file) {
                return;
            }

            const uploadItem = uploadItemsRef.current.find((currentUploadItem) => currentUploadItem.id === uploadId);
            if (!isUploadStartable(uploadItem)) {
                return;
            }

            const controller = new AbortController();
            uploadControllersRef.current.set(uploadId, controller);
            markUploadAsUploading(uploadId);

            try {
                const uploadRequestOptions = createUploadRequestOptions(
                    file,
                    uploadId,
                    controller.signal,
                    queueProgressUpdate,
                );
                const url = await onFileUpload(file, uploadRequestOptions);

                completeUpload(uploadId, file, url);
            } catch (error) {
                if (isAbortError(error)) {
                    markUploadAsPaused(uploadId);
                } else {
                    failUpload(uploadId, file, error);
                }
            } finally {
                uploadControllersRef.current.delete(uploadId);
                queueUploadProcessing();
            }
        },
        [
            completeUpload,
            failUpload,
            markUploadAsPaused,
            markUploadAsUploading,
            onFileUpload,
            queueProgressUpdate,
            queueUploadProcessing,
            uploadFilesRef,
            uploadItemsRef,
        ],
    );

    const processUploadQueue = useCallback(() => {
        if (!onFileUpload) {
            return;
        }

        const currentUploadItems = uploadItemsRef.current;
        const activeUploadCount = currentUploadItems.filter((uploadItem) => uploadItem.status === 'uploading').length;
        const availableSlots = Math.max(0, DEFAULT_MAX_CONCURRENT_UPLOADS - activeUploadCount);
        const queuedUploadIds = getQueuedUploadIds(currentUploadItems, availableSlots);

        queuedUploadIds.forEach((queuedUploadId) => {
            void startUpload(queuedUploadId);
        });
    }, [onFileUpload, startUpload, uploadItemsRef]);

    processUploadQueueRef.current = processUploadQueue;

    const pauseUpload = useCallback(
        (uploadId: string) => {
            pauseQueuedUpload(uploadId);
            uploadControllersRef.current.get(uploadId)?.abort();
        },
        [pauseQueuedUpload],
    );

    const resumeUpload = useCallback(
        (uploadId: string) => {
            resetUploadForRetry(uploadId);
            queueUploadProcessing();
        },
        [queueUploadProcessing, resetUploadForRetry],
    );

    const clearUploadQueue = useCallback(() => {
        clearScheduledTimer(uploadQueueTimerRef.current);
        uploadQueueTimerRef.current = null;

        for (const controller of uploadControllersRef.current.values()) {
            controller.abort();
        }

        uploadControllersRef.current.clear();
    }, []);

    useEffect(() => clearUploadQueue, [clearUploadQueue]);

    return {
        pauseUpload,
        resumeUpload,
        queueUploadProcessing,
        clearUploadQueue,
    };
}
