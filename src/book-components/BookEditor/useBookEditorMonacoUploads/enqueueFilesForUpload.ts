import type { editor } from 'monaco-editor';
import { BookEditable } from '../../../book-2.0/agent-source/BookEditable';
import type { string_book } from '../../../book-2.0/agent-source/string_book';
import { BookEditorMonacoFormatting } from '../BookEditorMonacoFormatting';
import type { SetUploadItems, UploadItem, UploadPlaceholderEntry } from './bookEditorMonacoUploadTypes';

/**
 * Type describing monaco editor.
 *
 * @private function of BookEditorMonaco
 */
type MonacoEditor = typeof import('monaco-editor');

/**
 * Type describing how upload placeholders should be inserted into the Monaco model.
 *
 * @private function of BookEditorMonaco
 */
type UploadPlaceholderInsertPlan = {
    readonly insertLine: number;
    readonly insertColumn: number;
    readonly insertStartOffset: number;
    readonly prefixLength: number;
    readonly textToInsert: string;
};

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
 * Props for Monaco placeholder insertion.
 *
 * @private function of BookEditorMonaco
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
export function enqueueFilesForUpload({
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
