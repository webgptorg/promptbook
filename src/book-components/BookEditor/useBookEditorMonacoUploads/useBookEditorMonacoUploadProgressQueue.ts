import { useCallback, useRef } from 'react';
import { BookEditorMonacoConstants } from '../BookEditorMonacoConstants';
import type { SetUploadItems, UploadItem, UploadProgressUpdate } from './bookEditorMonacoUploadTypes';
import { clearScheduledTimer } from './clearScheduledTimer';

/**
 * Applies debounced progress updates gathered between renders.
 *
 * @private function of BookEditorMonaco
 */
function applyProgressUpdates(
    uploadItems: ReadonlyArray<UploadItem>,
    progressUpdates: ReadonlyMap<string, UploadProgressUpdate>,
): Array<UploadItem> {
    return uploadItems.map((uploadItem) => {
        const progressUpdate = progressUpdates.get(uploadItem.id);
        if (!progressUpdate) {
            return uploadItem;
        }

        return {
            ...uploadItem,
            progress: progressUpdate.progress,
            loadedBytes: progressUpdate.loadedBytes,
            totalBytes: progressUpdate.totalBytes,
        };
    });
}

/**
 * Debounces upload progress updates before they hit React state.
 *
 * @private function of BookEditorMonaco
 */
export function useBookEditorMonacoUploadProgressQueue({ setUploadItems }: { readonly setUploadItems: SetUploadItems }) {
    const progressUpdateTimerRef = useRef<number | null>(null);
    const pendingProgressUpdatesRef = useRef<Map<string, UploadProgressUpdate>>(new Map());

    const flushProgressUpdates = useCallback(() => {
        progressUpdateTimerRef.current = null;

        const progressUpdates = pendingProgressUpdatesRef.current;
        pendingProgressUpdatesRef.current = new Map();

        setUploadItems((currentUploadItems) => applyProgressUpdates(currentUploadItems, progressUpdates));
    }, [setUploadItems]);

    const queueProgressUpdate = useCallback(
        (uploadId: string, progress: number, loadedBytes: number, totalBytes: number) => {
            pendingProgressUpdatesRef.current.set(uploadId, {
                progress,
                loadedBytes,
                totalBytes,
            });

            if (progressUpdateTimerRef.current !== null) {
                return;
            }

            progressUpdateTimerRef.current = window.setTimeout(() => {
                flushProgressUpdates();
            }, BookEditorMonacoConstants.UPLOAD_PROGRESS_DEBOUNCE_MS);
        },
        [flushProgressUpdates],
    );

    const clearProgressQueue = useCallback(() => {
        clearScheduledTimer(progressUpdateTimerRef.current);
        progressUpdateTimerRef.current = null;
        pendingProgressUpdatesRef.current = new Map();
    }, []);

    return {
        queueProgressUpdate,
        clearProgressQueue,
    };
}
