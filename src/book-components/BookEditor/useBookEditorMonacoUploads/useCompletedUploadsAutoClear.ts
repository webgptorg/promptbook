import { useEffect } from 'react';
import type { SetUploadItems, UploadDecorationIdsRef, UploadFilesRef, UploadItem } from './bookEditorMonacoUploadTypes';

/**
 * Delay before clearing completed uploads from UI.
 *
 * @private function of BookEditorMonaco
 */
const COMPLETED_UPLOADS_CLEAR_DELAY_MS = 1500;

/**
 * Clears upload UI state shortly after all uploads finish.
 *
 * @private function of BookEditorMonaco
 */
export function useCompletedUploadsAutoClear({
    uploadItems,
    uploadFilesRef,
    uploadDecorationIdsRef,
    setUploadItems,
}: {
    readonly uploadItems: ReadonlyArray<UploadItem>;
    readonly uploadFilesRef: UploadFilesRef;
    readonly uploadDecorationIdsRef: UploadDecorationIdsRef;
    readonly setUploadItems: SetUploadItems;
}) {
    useEffect(() => {
        if (uploadItems.length === 0) {
            return;
        }

        const hasActiveUploads = uploadItems.some((item) => item.status !== 'completed');
        if (hasActiveUploads) {
            return;
        }

        const timer = window.setTimeout(() => {
            uploadFilesRef.current.clear();
            uploadDecorationIdsRef.current.clear();
            setUploadItems(() => []);
        }, COMPLETED_UPLOADS_CLEAR_DELAY_MS);

        return () => {
            clearTimeout(timer);
        };
    }, [setUploadItems, uploadDecorationIdsRef, uploadFilesRef, uploadItems]);
}
