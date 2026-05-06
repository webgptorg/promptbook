import type { editor } from 'monaco-editor';
import { type MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Promisable } from 'type-fest';
import { BookEditable } from '../../book-2.0/agent-source/BookEditable';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { DEFAULT_MAX_CONCURRENT_UPLOADS } from '../../config';
import { BookEditorMonacoConstants } from './BookEditorMonacoConstants';
import { BookEditorMonacoFormatting } from './BookEditorMonacoFormatting';

/**
 * Type describing monaco editor.
 */
type MonacoEditor = typeof import('monaco-editor');

/**
 * Type describing upload status.
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
 */
type UploadProgressUpdate = {
    readonly progress: number;
    readonly loadedBytes: number;
    readonly totalBytes: number;
};

/**
 * Type describing upload replacement.
 */
type UploadReplacement = {
    readonly uploadId: string;
    readonly decorationId: string;
    readonly replacementText: string;
};

/**
 * Type describing placeholder entry inserted into Monaco while the file uploads.
 */
type UploadPlaceholderEntry = {
    readonly id: string;
    readonly file: File;
    readonly placeholder: string;
};

/**
 * Type describing how upload placeholders should be inserted into the Monaco model.
 */
type UploadPlaceholderInsertPlan = {
    readonly insertLine: number;
    readonly insertColumn: number;
    readonly insertStartOffset: number;
    readonly prefixLength: number;
    readonly textToInsert: string;
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
 */
type BookEditorMonacoUploadProgressCallback = (
    progress: number,
    stats?: {
        loadedBytes: number;
        totalBytes: number;
    },
) => void;

/**
 * Options for book editor monaco upload.
 */
type BookEditorMonacoUploadOptions = {
    readonly onProgress?: BookEditorMonacoUploadProgressCallback;
    readonly abortSignal?: AbortSignal;
};

/**
 * Type describing book editor monaco on file upload.
 */
type BookEditorMonacoOnFileUpload = (
    file: File,
    options?: BookEditorMonacoUploadOptions | BookEditorMonacoUploadProgressCallback,
) => Promisable<string>;

/**
 * Type describing callback-shaped upload options passed to `onFileUpload`.
 */
type UploadRequestOptions = BookEditorMonacoUploadProgressCallback & {
    onProgress?: BookEditorMonacoUploadProgressCallback;
    abortSignal?: AbortSignal;
};

/**
 * Props for use book editor monaco uploads.
 */
type UseBookEditorMonacoUploadsProps = {
    readonly editor: editor.IStandaloneCodeEditor | null;
    readonly monaco: MonacoEditor | null;
    readonly onFileUpload?: BookEditorMonacoOnFileUpload;
};

/**
 * Setter-like updater used by upload state helpers.
 */
type SetUploadItems = (updater: (items: UploadItem[]) => UploadItem[]) => void;

/**
 * Single-upload updater used by upload state helpers.
 */
type UpdateUploadItem = (uploadId: string, createNextUploadItem: (uploadItem: UploadItem) => UploadItem) => void;

/**
 * Mutable upload items reference shared across upload helpers.
 */
type UploadItemsRef = MutableRefObject<UploadItem[]>;

/**
 * Mutable upload file registry reference shared across upload helpers.
 */
type UploadFilesRef = MutableRefObject<Map<string, File>>;

/**
 * Mutable Monaco decoration registry reference shared across upload helpers.
 */
type UploadDecorationIdsRef = MutableRefObject<Map<string, string>>;

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
 * Updates one upload item while leaving every other item untouched.
 *
 * @private function of BookEditorMonaco
 */
function replaceUploadItemById(
    uploadItems: ReadonlyArray<UploadItem>,
    uploadId: string,
    updateUploadItem: (uploadItem: UploadItem) => UploadItem,
): Array<UploadItem> {
    return uploadItems.map((uploadItem) => (uploadItem.id === uploadId ? updateUploadItem(uploadItem) : uploadItem));
}

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
 * Creates placeholder entries for files that are about to be uploaded.
 *
 * @private function of BookEditorMonaco
 */
function createUploadPlaceholderEntries(files: ReadonlyArray<File>): Array<UploadPlaceholderEntry> {
    return files.map((file) => ({
        id: createUploadId(),
        file,
        placeholder: BookEditorMonacoFormatting.getUploadPlaceholderText(file.name),
    }));
}

/**
 * Resolves the Monaco insertion point for new upload placeholders.
 *
 * @private function of BookEditorMonaco
 */
function createUploadPlaceholderInsertPlan(
    model: editor.ITextModel,
    monaco: MonacoEditor,
    placeholders: ReadonlyArray<UploadPlaceholderEntry>,
): UploadPlaceholderInsertPlan {
    const currentValue = model.getValue() as string_book;
    const bookEditable = new BookEditable(currentValue);
    const closedLineIndex = bookEditable.findLastCommitmentLineIndex('CLOSED');
    const isInsertingBeforeClosed = closedLineIndex !== null;
    const insertLine = isInsertingBeforeClosed ? closedLineIndex + 1 : model.getLineCount();
    const insertColumn = isInsertingBeforeClosed ? 1 : model.getLineMaxColumn(insertLine);
    const shouldAddLeadingLineBreak = !isInsertingBeforeClosed && Boolean(currentValue);
    const prefix = shouldAddLeadingLineBreak ? '\n' : '';
    const placeholderBlock = placeholders.map(({ placeholder }) => `${placeholder}\n`).join('');
    const textToInsert = `${prefix}${placeholderBlock}`;
    const insertStartOffset = model.getOffsetAt(new monaco.Position(insertLine, insertColumn));

    return {
        insertLine,
        insertColumn,
        insertStartOffset,
        prefixLength: prefix.length,
        textToInsert,
    };
}

/**
 * Creates Monaco decorations tracking the placeholder ranges for later replacement.
 *
 * @private function of BookEditorMonaco
 */
function createUploadPlaceholderDecorations(
    model: editor.ITextModel,
    monaco: MonacoEditor,
    placeholders: ReadonlyArray<UploadPlaceholderEntry>,
    insertStartOffset: number,
    prefixLength: number,
): Array<editor.IModelDeltaDecoration> {
    let runningOffset = prefixLength;

    return placeholders.map((placeholder) => {
        const startOffset = insertStartOffset + runningOffset;
        const endOffset = startOffset + placeholder.placeholder.length;
        const startPosition = model.getPositionAt(startOffset);
        const endPosition = model.getPositionAt(endOffset);

        runningOffset += placeholder.placeholder.length + 1;

        return {
            range: new monaco.Range(
                startPosition.lineNumber,
                startPosition.column,
                endPosition.lineNumber,
                endPosition.column,
            ),
            options: {
                stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            },
        };
    });
}

/**
 * Creates queued upload items matching newly inserted placeholders.
 *
 * @private function of BookEditorMonaco
 */
function createQueuedUploadItems(placeholders: ReadonlyArray<UploadPlaceholderEntry>): Array<UploadItem> {
    return placeholders.map(({ id, file }) => ({
        id,
        fileName: file.name,
        fileSize: file.size,
        status: 'queued',
        progress: 0,
        loadedBytes: 0,
        totalBytes: file.size,
        startedAt: null,
        completedAt: null,
    }));
}

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
 * Type describing the callback used to enqueue debounced progress updates.
 */
type QueueProgressUpdate = (uploadId: string, progress: number, loadedBytes: number, totalBytes: number) => void;

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
 * Clears an optional scheduled timer when it exists.
 *
 * @private function of BookEditorMonaco
 */
function clearScheduledTimer(timerId: number | null): void {
    if (timerId !== null) {
        clearTimeout(timerId);
    }
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
function useBookEditorMonacoUploadItemsState() {
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

/**
 * Debounces upload progress updates before they hit React state.
 *
 * @private function of BookEditorMonaco
 */
function useBookEditorMonacoUploadProgressQueue({ setUploadItems }: { readonly setUploadItems: SetUploadItems }) {
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

/**
 * Props for Monaco placeholder and replacement synchronization.
 */
type UseBookEditorMonacoUploadEditorSyncProps = {
    readonly editor: editor.IStandaloneCodeEditor | null;
    readonly uploadFilesRef: UploadFilesRef;
    readonly uploadDecorationIdsRef: UploadDecorationIdsRef;
};

/**
 * Manages Monaco placeholder insertion and later replacement with uploaded URLs.
 *
 * @private function of BookEditorMonaco
 */
function useBookEditorMonacoUploadEditorSync({
    editor,
    uploadFilesRef,
    uploadDecorationIdsRef,
}: UseBookEditorMonacoUploadEditorSyncProps) {
    const editorUpdateTimerRef = useRef<number | null>(null);
    const pendingReplacementsRef = useRef<UploadReplacement[]>([]);

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

    const registerUploadPlaceholderResources = useCallback(
        (placeholders: ReadonlyArray<UploadPlaceholderEntry>, decorationIds: ReadonlyArray<string>) => {
            placeholders.forEach((placeholder, index) => {
                uploadFilesRef.current.set(placeholder.id, placeholder.file);

                const decorationId = decorationIds[index];
                if (decorationId) {
                    uploadDecorationIdsRef.current.set(placeholder.id, decorationId);
                }
            });
        },
        [],
    );

    const queueEditorReplacement = useCallback(
        (uploadId: string, replacementText: string) => {
            const hasQueuedReplacement = queueEditorReplacementItem(
                uploadId,
                replacementText,
                uploadDecorationIdsRef,
                pendingReplacementsRef,
            );
            if (!hasQueuedReplacement) {
                return;
            }

            if (editorUpdateTimerRef.current !== null) {
                return;
            }

            editorUpdateTimerRef.current = window.setTimeout(() => {
                editorUpdateTimerRef.current = null;
                flushEditorReplacements();
            }, BookEditorMonacoConstants.UPLOAD_EDIT_DEBOUNCE_MS);
        },
        [flushEditorReplacements, uploadDecorationIdsRef],
    );

    const clearEditorSync = useCallback(() => {
        clearScheduledTimer(editorUpdateTimerRef.current);
        editorUpdateTimerRef.current = null;
        pendingReplacementsRef.current = [];
    }, []);

    return {
        registerUploadPlaceholderResources,
        queueEditorReplacement,
        clearEditorSync,
    };
}

/**
 * Enqueues replacement text for one upload placeholder.
 *
 * @private function of BookEditorMonaco
 */
function queueEditorReplacementItem(
    uploadId: string,
    replacementText: string,
    uploadDecorationIdsRef: UploadDecorationIdsRef,
    pendingReplacementsRef: MutableRefObject<UploadReplacement[]>,
): boolean {
    const decorationId = uploadDecorationIdsRef.current.get(uploadId);
    if (!decorationId) {
        return false;
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

    return true;
}

/**
 * Props for Monaco placeholder insertion.
 */
type EnqueueFilesForUploadProps = {
    readonly editor: editor.IStandaloneCodeEditor | null;
    readonly monaco: MonacoEditor | null;
    readonly registerUploadPlaceholderResources: (
        placeholders: ReadonlyArray<UploadPlaceholderEntry>,
        decorationIds: ReadonlyArray<string>,
    ) => void;
    readonly setUploadItems: SetUploadItems;
};

/**
 * Inserts Monaco placeholders and queues matching upload items.
 *
 * @private function of BookEditorMonaco
 */
function enqueueFilesForUpload({
    editor,
    monaco,
    registerUploadPlaceholderResources,
    setUploadItems,
}: EnqueueFilesForUploadProps): (files: ReadonlyArray<File>) => boolean {
    return (files) => {
        if (!editor || !monaco) {
            return false;
        }

        const model = editor.getModel();
        if (!model) {
            return false;
        }

        const placeholders = createUploadPlaceholderEntries(files);
        const insertPlan = createUploadPlaceholderInsertPlan(model, monaco, placeholders);

        editor.executeEdits('upload-placeholders', [
            {
                range: new monaco.Range(
                    insertPlan.insertLine,
                    insertPlan.insertColumn,
                    insertPlan.insertLine,
                    insertPlan.insertColumn,
                ),
                text: insertPlan.textToInsert,
                forceMoveMarkers: true,
            },
        ]);

        const placeholderDecorations = createUploadPlaceholderDecorations(
            model,
            monaco,
            placeholders,
            insertPlan.insertStartOffset,
            insertPlan.prefixLength,
        );
        const decorationIds = editor.deltaDecorations([], placeholderDecorations);

        registerUploadPlaceholderResources(placeholders, decorationIds);
        setUploadItems((currentUploadItems) => [...currentUploadItems, ...createQueuedUploadItems(placeholders)]);

        return true;
    };
}

/**
 * Props for upload queue processing and pause/resume handling.
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
function useBookEditorMonacoUploadQueue({
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

/**
 * Clears upload UI state shortly after all uploads finish.
 *
 * @private function of BookEditorMonaco
 */
function useCompletedUploadsAutoClear({
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
