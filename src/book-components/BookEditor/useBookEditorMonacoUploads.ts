import type { editor } from 'monaco-editor';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { BookEditorMonacoOnFileUpload } from './useBookEditorMonacoUploads/bookEditorMonacoUploadTypes';
import { enqueueFilesForUpload } from './useBookEditorMonacoUploads/enqueueFilesForUpload';
import { useBookEditorMonacoUploadEditorSync } from './useBookEditorMonacoUploads/useBookEditorMonacoUploadEditorSync';
import { useBookEditorMonacoUploadItemsState } from './useBookEditorMonacoUploads/useBookEditorMonacoUploadItemsState';
import { useBookEditorMonacoUploadProgressQueue } from './useBookEditorMonacoUploads/useBookEditorMonacoUploadProgressQueue';
import { useBookEditorMonacoUploadQueue } from './useBookEditorMonacoUploads/useBookEditorMonacoUploadQueue';
import { useCompletedUploadsAutoClear } from './useBookEditorMonacoUploads/useCompletedUploadsAutoClear';

export type { UploadItem, UploadStats } from './useBookEditorMonacoUploads/bookEditorMonacoUploadTypes';

/**
 * Type describing monaco editor.
 */
type MonacoEditor = typeof import('monaco-editor');

/**
 * Props for use book editor monaco uploads.
 */
type UseBookEditorMonacoUploadsProps = {
    readonly editor: editor.IStandaloneCodeEditor | null;
    readonly monaco: MonacoEditor | null;
    readonly onFileUpload?: BookEditorMonacoOnFileUpload;
};

/**
 * Handles file uploads and placeholder rendering inside `BookEditorMonaco`.
 *
 * @private function of BookEditorMonaco
 */
export function useBookEditorMonacoUploads({ editor, monaco, onFileUpload }: UseBookEditorMonacoUploadsProps) {
    const uploadFilesRef = useRef<Map<string, File>>(new Map());
    const uploadDecorationIdsRef = useRef<Map<string, string>>(new Map());
    const { uploadItems, uploadItemsRef, setUploadItems, updateUploadItem, uploadStats, activeUploadItems } =
        useBookEditorMonacoUploadItemsState();
    const { queueProgressUpdate, clearProgressQueue } = useBookEditorMonacoUploadProgressQueue({ setUploadItems });
    const { registerUploadPlaceholderResources, queueEditorReplacement, clearEditorSync } =
        useBookEditorMonacoUploadEditorSync({
            editor,
            uploadFilesRef,
            uploadDecorationIdsRef,
        });

    const enqueueFiles = useMemo(
        () =>
            enqueueFilesForUpload({
                editor,
                monaco,
                registerUploadPlaceholderResources,
                setUploadItems,
            }),
        [editor, monaco, registerUploadPlaceholderResources, setUploadItems],
    );

    const { pauseUpload, resumeUpload, queueUploadProcessing, clearUploadQueue } = useBookEditorMonacoUploadQueue({
        onFileUpload,
        uploadItemsRef,
        uploadFilesRef,
        queueProgressUpdate,
        queueEditorReplacement,
        setUploadItems,
        updateUploadItem,
    });

    useCompletedUploadsAutoClear({
        uploadItems,
        uploadFilesRef,
        uploadDecorationIdsRef,
        setUploadItems,
    });

    useEffect(() => {
        return () => {
            clearEditorSync();
            clearProgressQueue();
            clearUploadQueue();
        };
    }, [clearEditorSync, clearProgressQueue, clearUploadQueue]);

    const handleFiles = useCallback(
        async (files: File[]) => {
            if (!onFileUpload || files.length === 0) {
                return;
            }

            const hasQueuedUploads = enqueueFiles(files);
            if (!hasQueuedUploads) {
                return;
            }

            queueUploadProcessing();
        },
        [enqueueFiles, onFileUpload, queueUploadProcessing],
    );

    return {
        activeUploadItems,
        uploadItems,
        uploadStats,
        handleFiles,
        pauseUpload,
        resumeUpload,
    };
}
