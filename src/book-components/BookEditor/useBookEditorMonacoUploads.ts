import type { editor } from 'monaco-editor';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Promisable } from 'type-fest';
import { BookEditable } from '../../book-2.0/agent-source/BookEditable';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { DEFAULT_MAX_CONCURRENT_UPLOADS } from '../../config';
import { BookEditorMonacoConstants } from './BookEditorMonacoConstants';
import { BookEditorMonacoFormatting } from './BookEditorMonacoFormatting';

type MonacoEditor = typeof import('monaco-editor');

type UploadStatus = 'queued' | 'uploading' | 'paused' | 'completed' | 'failed';

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

type UploadProgressUpdate = {
    readonly progress: number;
    readonly loadedBytes: number;
    readonly totalBytes: number;
};

type UploadReplacement = {
    readonly uploadId: string;
    readonly decorationId: string;
    readonly replacementText: string;
};

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

type BookEditorMonacoUploadProgressCallback = (
    progress: number,
    stats?: {
        loadedBytes: number;
        totalBytes: number;
    },
) => void;

type BookEditorMonacoUploadOptions = {
    readonly onProgress?: BookEditorMonacoUploadProgressCallback;
    readonly abortSignal?: AbortSignal;
};

type BookEditorMonacoOnFileUpload = (
    file: File,
    options?: BookEditorMonacoUploadOptions | BookEditorMonacoUploadProgressCallback,
) => Promisable<string>;

type UseBookEditorMonacoUploadsProps = {
    readonly editor: editor.IStandaloneCodeEditor | null;
    readonly monaco: MonacoEditor | null;
    readonly onFileUpload?: BookEditorMonacoOnFileUpload;
};

/**
 * Delay before clearing completed uploads from UI.
 *
 * @private function of BookEditorMonaco
 */
const COMPLETED_UPLOADS_CLEAR_DELAY_MS = 1500;

/**
 * Generates deterministic ids for uploads that support server preloading.
 *
 * @private function of BookEditorMonaco
 */
const createUploadId = (() => {
    let sequence = 0;
    return () => {
        if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
            return crypto.randomUUID();
        }

        sequence += 1;
        return `upload-${Date.now()}-${sequence}`;
    };
})();

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
 * Handles file uploads and placeholder rendering inside `BookEditorMonaco`.
 *
 * @private function of BookEditorMonaco
 */
export function useBookEditorMonacoUploads({ editor, monaco, onFileUpload }: UseBookEditorMonacoUploadsProps) {
    const [uploadItems, setUploadItemsState] = useState<UploadItem[]>([]);
    const uploadItemsRef = useRef<UploadItem[]>([]);
    const uploadFilesRef = useRef<Map<string, File>>(new Map());
    const uploadDecorationIdsRef = useRef<Map<string, string>>(new Map());
    const uploadControllersRef = useRef<Map<string, AbortController>>(new Map());
    const uploadQueueTimerRef = useRef<number | null>(null);
    const editorUpdateTimerRef = useRef<number | null>(null);
    const progressUpdateTimerRef = useRef<number | null>(null);
    const pendingReplacementsRef = useRef<UploadReplacement[]>([]);
    const pendingProgressUpdatesRef = useRef<Map<string, UploadProgressUpdate>>(new Map());
    const processUploadQueueRef = useRef<() => void>(() => undefined);

    const setUploadItems = useCallback((updater: (items: UploadItem[]) => UploadItem[]) => {
        const next = updater(uploadItemsRef.current);
        uploadItemsRef.current = next;
        setUploadItemsState(next);
    }, []);

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
                progressUpdateTimerRef.current = null;
                const updates = pendingProgressUpdatesRef.current;
                pendingProgressUpdatesRef.current = new Map();

                setUploadItems((items) =>
                    items.map((item) => {
                        const update = updates.get(item.id);
                        if (!update) {
                            return item;
                        }

                        return {
                            ...item,
                            progress: update.progress,
                            loadedBytes: update.loadedBytes,
                            totalBytes: update.totalBytes,
                        };
                    }),
                );
            }, BookEditorMonacoConstants.UPLOAD_PROGRESS_DEBOUNCE_MS);
        },
        [setUploadItems],
    );

    const flushEditorReplacements = useCallback(() => {
        if (!editor) {
            return;
        }

        const model = editor.getModel();
        if (!model) {
            return;
        }

        const replacements = pendingReplacementsRef.current;
        pendingReplacementsRef.current = [];

        const edits: editor.IIdentifiedSingleEditOperation[] = [];
        const decorationsToRemove: string[] = [];

        for (const replacement of replacements) {
            const range = model.getDecorationRange(replacement.decorationId);
            if (!range) {
                uploadDecorationIdsRef.current.delete(replacement.uploadId);
                continue;
            }

            edits.push({
                range,
                text: replacement.replacementText,
                forceMoveMarkers: true,
            });
            decorationsToRemove.push(replacement.decorationId);
            uploadDecorationIdsRef.current.delete(replacement.uploadId);
        }

        if (edits.length > 0) {
            editor.executeEdits('upload-replacements', edits);
        }

        if (decorationsToRemove.length > 0) {
            editor.deltaDecorations(decorationsToRemove, []);
        }
    }, [editor]);

    const queueEditorReplacement = useCallback(
        (uploadId: string, replacementText: string) => {
            const decorationId = uploadDecorationIdsRef.current.get(uploadId);
            if (!decorationId) {
                return;
            }

            const pendingIndex = pendingReplacementsRef.current.findIndex((item) => item.uploadId === uploadId);
            const nextReplacement: UploadReplacement = {
                uploadId,
                decorationId,
                replacementText,
            };

            if (pendingIndex >= 0) {
                pendingReplacementsRef.current[pendingIndex] = nextReplacement;
            } else {
                pendingReplacementsRef.current.push(nextReplacement);
            }

            if (editorUpdateTimerRef.current !== null) {
                return;
            }

            editorUpdateTimerRef.current = window.setTimeout(() => {
                editorUpdateTimerRef.current = null;
                flushEditorReplacements();
            }, BookEditorMonacoConstants.UPLOAD_EDIT_DEBOUNCE_MS);
        },
        [flushEditorReplacements],
    );

    const queueUploadProcessing = useCallback(() => {
        if (uploadQueueTimerRef.current !== null) {
            return;
        }

        uploadQueueTimerRef.current = window.setTimeout(() => {
            uploadQueueTimerRef.current = null;
            processUploadQueueRef.current();
        }, 0);
    }, []);

    const startUpload = useCallback(
        async (uploadId: string) => {
            if (!onFileUpload) {
                return;
            }

            const file = uploadFilesRef.current.get(uploadId);
            if (!file) {
                return;
            }

            const current = uploadItemsRef.current.find((item) => item.id === uploadId);
            if (!current || current.status === 'uploading' || current.status === 'completed') {
                return;
            }

            const controller = new AbortController();
            uploadControllersRef.current.set(uploadId, controller);

            setUploadItems((items) =>
                items.map((item) =>
                    item.id === uploadId
                        ? {
                              ...item,
                              status: 'uploading',
                              startedAt: item.startedAt ?? Date.now(),
                              errorMessage: undefined,
                          }
                        : item,
                ),
            );

            try {
                const progressHandler = ((progress, stats) => {
                    const loadedBytes = stats?.loadedBytes ?? Math.round(Math.min(1, progress) * (file.size || 0));
                    const totalBytes = stats?.totalBytes ?? (file.size || loadedBytes);
                    queueProgressUpdate(uploadId, progress, loadedBytes, totalBytes);
                }) as BookEditorMonacoUploadProgressCallback & {
                    onProgress?: BookEditorMonacoUploadProgressCallback;
                    abortSignal?: AbortSignal;
                };

                progressHandler.onProgress = progressHandler;
                progressHandler.abortSignal = controller.signal;

                const url = await onFileUpload(file, progressHandler);

                queueProgressUpdate(uploadId, 1, file.size, file.size);
                queueEditorReplacement(uploadId, `KNOWLEDGE ${url}`);

                setUploadItems((items) =>
                    items.map((item) =>
                        item.id === uploadId
                            ? {
                                  ...item,
                                  status: 'completed',
                                  progress: 1,
                                  loadedBytes: item.totalBytes || file.size,
                                  completedAt: Date.now(),
                              }
                            : item,
                    ),
                );
            } catch (error) {
                if (isAbortError(error)) {
                    setUploadItems((items) =>
                        items.map((item) =>
                            item.id === uploadId
                                ? {
                                      ...item,
                                      status: 'paused',
                                      errorMessage: undefined,
                                  }
                                : item,
                        ),
                    );
                } else {
                    console.error(`File upload failed for ${file.name}:`, error);
                    queueEditorReplacement(uploadId, `KNOWLEDGE ❌ Failed to upload ${file.name}`);
                    setUploadItems((items) =>
                        items.map((item) =>
                            item.id === uploadId
                                ? {
                                      ...item,
                                      status: 'failed',
                                      errorMessage: error instanceof Error ? error.message : 'Upload failed',
                                  }
                                : item,
                        ),
                    );
                }
            } finally {
                uploadControllersRef.current.delete(uploadId);
                queueUploadProcessing();
            }
        },
        [onFileUpload, queueEditorReplacement, queueProgressUpdate, queueUploadProcessing, setUploadItems],
    );

    const processUploadQueue = useCallback(() => {
        if (!onFileUpload) {
            return;
        }

        const currentItems = uploadItemsRef.current;
        const activeCount = currentItems.filter((item) => item.status === 'uploading').length;
        const availableSlots = Math.max(0, DEFAULT_MAX_CONCURRENT_UPLOADS - activeCount);
        if (availableSlots === 0) {
            return;
        }

        const queuedItems = currentItems.filter((item) => item.status === 'queued').slice(0, availableSlots);
        queuedItems.forEach((item) => {
            void startUpload(item.id);
        });
    }, [onFileUpload, startUpload]);

    processUploadQueueRef.current = processUploadQueue;

    const pauseUpload = useCallback(
        (uploadId: string) => {
            setUploadItems((items) =>
                items.map((item) =>
                    item.id === uploadId && item.status === 'queued'
                        ? {
                              ...item,
                              status: 'paused',
                          }
                        : item,
                ),
            );

            const controller = uploadControllersRef.current.get(uploadId);
            controller?.abort();
        },
        [setUploadItems],
    );

    const resumeUpload = useCallback(
        (uploadId: string) => {
            setUploadItems((items) =>
                items.map((item) =>
                    item.id === uploadId
                        ? {
                              ...item,
                              status: 'queued',
                              progress: 0,
                              loadedBytes: 0,
                              startedAt: null,
                              completedAt: null,
                              errorMessage: undefined,
                          }
                        : item,
                ),
            );

            queueUploadProcessing();
        },
        [queueUploadProcessing, setUploadItems],
    );

    useEffect(() => {
        return () => {
            if (uploadQueueTimerRef.current !== null) {
                clearTimeout(uploadQueueTimerRef.current);
            }
            if (editorUpdateTimerRef.current !== null) {
                clearTimeout(editorUpdateTimerRef.current);
            }
            if (progressUpdateTimerRef.current !== null) {
                clearTimeout(progressUpdateTimerRef.current);
            }

            for (const controller of uploadControllersRef.current.values()) {
                controller.abort();
            }

            uploadControllersRef.current.clear();
        };
    }, []);

    useEffect(() => {
        if (uploadItems.length === 0) {
            return;
        }

        const hasActive = uploadItems.some((item) => item.status !== 'completed');
        if (hasActive) {
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
    }, [uploadItems]);

    const handleFiles = useCallback(
        async (files: File[]) => {
            if (!onFileUpload || !editor || !monaco) {
                return;
            }

            if (files.length === 0) {
                return;
            }

            const model = editor.getModel();
            if (!model) {
                return;
            }

            const placeholders = files.map((file) => ({
                id: createUploadId(),
                file,
                placeholder: BookEditorMonacoFormatting.getUploadPlaceholderText(file.name),
            }));

            const currentValue = (model.getValue() ?? '') as string_book;
            const bookEditable = new BookEditable(currentValue);
            const closedLineIndex = bookEditable.findLastCommitmentLineIndex('CLOSED');
            const insertingBeforeClosed = closedLineIndex !== null;
            const insertLine = insertingBeforeClosed ? closedLineIndex + 1 : model.getLineCount();
            const insertColumn = insertingBeforeClosed ? 1 : model.getLineMaxColumn(insertLine);
            const shouldAddLeadingLineBreak = !insertingBeforeClosed && Boolean(model.getValue());
            const prefix = shouldAddLeadingLineBreak ? '\n' : '';
            const placeholderBlock = placeholders.map((entry) => `${entry.placeholder}\n`).join('');
            const textToInsert = `${prefix}${placeholderBlock}`;
            const insertStartOffset = model.getOffsetAt(new monaco.Position(insertLine, insertColumn));

            editor.executeEdits('upload-placeholders', [
                {
                    range: new monaco.Range(insertLine, insertColumn, insertLine, insertColumn),
                    text: textToInsert,
                    forceMoveMarkers: true,
                },
            ]);

            const decorations: editor.IModelDeltaDecoration[] = [];
            let runningOffset = prefix.length;

            for (const entry of placeholders) {
                const startOffset = insertStartOffset + runningOffset;
                const endOffset = startOffset + entry.placeholder.length;
                const startPos = model.getPositionAt(startOffset);
                const endPos = model.getPositionAt(endOffset);

                decorations.push({
                    range: new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
                    options: {
                        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
                    },
                });

                runningOffset += entry.placeholder.length + 1;
            }

            const decorationIds = editor.deltaDecorations([], decorations);

            placeholders.forEach((entry, index) => {
                uploadFilesRef.current.set(entry.id, entry.file);
                const decorationId = decorationIds[index];
                if (decorationId) {
                    uploadDecorationIdsRef.current.set(entry.id, decorationId);
                }
            });

            const newUploadItems: UploadItem[] = placeholders.map((entry) => ({
                id: entry.id,
                fileName: entry.file.name,
                fileSize: entry.file.size,
                status: 'queued',
                progress: 0,
                loadedBytes: 0,
                totalBytes: entry.file.size,
                startedAt: null,
                completedAt: null,
            }));

            setUploadItems((items) => [...items, ...newUploadItems]);

            queueUploadProcessing();
        },
        [onFileUpload, editor, monaco, queueUploadProcessing],
    );

    const uploadStats = useMemo<UploadStats>(() => {
        const totalFiles = uploadItems.length;
        const queuedFiles = uploadItems.filter((item) => item.status === 'queued').length;
        const uploadingFiles = uploadItems.filter((item) => item.status === 'uploading').length;
        const pausedFiles = uploadItems.filter((item) => item.status === 'paused').length;
        const failedFiles = uploadItems.filter((item) => item.status === 'failed').length;
        const completedFiles = uploadItems.filter((item) => item.status === 'completed').length;
        const totalBytes = uploadItems.reduce((sum, item) => sum + item.totalBytes, 0);
        const uploadedBytes = uploadItems.reduce((sum, item) => {
            const total = item.totalBytes || 0;
            const loaded = total > 0 ? Math.min(item.loadedBytes, total) : item.loadedBytes;
            return sum + loaded;
        }, 0);
        const progress = totalBytes > 0 ? uploadedBytes / totalBytes : 0;
        const startedAt = uploadItems.reduce((min, item) => {
            if (!item.startedAt) {
                return min;
            }

            return Math.min(min, item.startedAt);
        }, Number.POSITIVE_INFINITY);
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
    }, [uploadItems]);

    const activeUploadItems = useMemo(() => uploadItems.filter((item) => item.status !== 'completed'), [uploadItems]);

    return {
        activeUploadItems,
        uploadItems,
        uploadStats,
        handleFiles,
        pauseUpload,
        resumeUpload,
    };
}
