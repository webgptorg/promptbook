import { useCallback, useMemo, useRef, useState } from 'react';
import type { SetUploadItems, UpdateUploadItem, UploadItem, UploadStats } from './bookEditorMonacoUploadTypes';

/**
 * Updates one upload item while leaving every other item untouched.
 *
 * @private function of BookEditorMonaco
 */
export function replaceUploadItemById(
    uploadItems: ReadonlyArray<UploadItem>,
    uploadId: string,
    updateUploadItem: (uploadItem: UploadItem) => UploadItem,
): Array<UploadItem> {
    return uploadItems.map((uploadItem) => (uploadItem.id === uploadId ? updateUploadItem(uploadItem) : uploadItem));
}

/**
 * Aggregates upload status, throughput and elapsed time for the upload panel.
 *
 * @private function of BookEditorMonaco
 */
function createUploadStats(uploadItems: ReadonlyArray<UploadItem>): UploadStats {
    let queuedFiles = 0;
    let uploadingFiles = 0;
    let pausedFiles = 0;
    let failedFiles = 0;
    let completedFiles = 0;
    let totalBytes = 0;
    let uploadedBytes = 0;
    let startedAt = Number.POSITIVE_INFINITY;

    for (const uploadItem of uploadItems) {
        switch (uploadItem.status) {
            case 'queued':
                queuedFiles += 1;
                break;
            case 'uploading':
                uploadingFiles += 1;
                break;
            case 'paused':
                pausedFiles += 1;
                break;
            case 'failed':
                failedFiles += 1;
                break;
            case 'completed':
                completedFiles += 1;
                break;
        }

        totalBytes += uploadItem.totalBytes;

        const normalizedTotalBytes = uploadItem.totalBytes || 0;
        const normalizedLoadedBytes =
            normalizedTotalBytes > 0 ? Math.min(uploadItem.loadedBytes, normalizedTotalBytes) : uploadItem.loadedBytes;
        uploadedBytes += normalizedLoadedBytes;

        if (uploadItem.startedAt) {
            startedAt = Math.min(startedAt, uploadItem.startedAt);
        }
    }

    const totalFiles = uploadItems.length;
    const progress = totalBytes > 0 ? uploadedBytes / totalBytes : 0;
    const elapsedMs = Number.isFinite(startedAt) ? Math.max(0, Date.now() - startedAt) : 0;
    const speedBytesPerSecond = elapsedMs > 0 ? uploadedBytes / (elapsedMs / 1000) : 0;

    return {
        totalFiles,
        queuedFiles,
        uploadingFiles,
        pausedFiles,
        failedFiles,
        completedFiles,
        totalBytes,
        uploadedBytes,
        progress,
        elapsedMs,
        speedBytesPerSecond,
    };
}

/**
 * Internal upload item state shared by Monaco upload helpers.
 *
 * @private function of BookEditorMonaco
 */
export function useBookEditorMonacoUploadItemsState() {
    const [uploadItems, setUploadItemsState] = useState<UploadItem[]>([]);
    const uploadItemsRef = useRef<UploadItem[]>([]);

    const setUploadItems = useCallback<SetUploadItems>((updater) => {
        const next = updater(uploadItemsRef.current);
        uploadItemsRef.current = next;
        setUploadItemsState(next);
    }, []);

    const updateUploadItem = useCallback<UpdateUploadItem>(
        (uploadId, createNextUploadItem) => {
            setUploadItems((currentUploadItems) =>
                replaceUploadItemById(currentUploadItems, uploadId, createNextUploadItem),
            );
        },
        [setUploadItems],
    );

    const uploadStats = useMemo<UploadStats>(() => createUploadStats(uploadItems), [uploadItems]);
    const activeUploadItems = useMemo(
        () => uploadItems.filter((uploadItem) => uploadItem.status !== 'completed'),
        [uploadItems],
    );

    return {
        uploadItems,
        uploadItemsRef,
        setUploadItems,
        updateUploadItem,
        uploadStats,
        activeUploadItems,
    };
}
