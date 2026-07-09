import type { editor } from 'monaco-editor';
import { type MutableRefObject, useCallback, useRef } from 'react';
import { BookEditorMonacoConstants } from '../BookEditorMonacoConstants';
import type { UploadDecorationIdsRef, UploadFilesRef, UploadPlaceholderEntry } from './bookEditorMonacoUploadTypes';
import { clearScheduledTimer } from './clearScheduledTimer';

/**
 * Type describing upload replacement.
 *
 * @private function of BookEditorMonaco
 */
type UploadReplacement = {
    readonly uploadId: string;
    readonly decorationId: string;
    readonly replacementText: string;
};

/**
 * Props for Monaco placeholder and replacement synchronization.
 *
 * @private function of BookEditorMonaco
 */
type UseBookEditorMonacoUploadEditorSyncProps = {
    readonly editor: editor.IStandaloneCodeEditor | null;
    readonly uploadFilesRef: UploadFilesRef;
    readonly uploadDecorationIdsRef: UploadDecorationIdsRef;
};

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
 * Manages Monaco placeholder insertion and later replacement with uploaded URLs.
 *
 * @private function of BookEditorMonaco
 */
export function useBookEditorMonacoUploadEditorSync({
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
