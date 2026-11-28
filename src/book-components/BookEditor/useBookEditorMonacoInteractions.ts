import type { editor } from 'monaco-editor';
import {
    type ChangeEvent,
    type ClipboardEvent,
    type DragEvent,
    type RefObject,
    type TouchEvent,
    useCallback,
    useMemo,
    useRef,
    useState,
} from 'react';

/**
 * Type describing the touch-start position cached for tap detection.
 */
type TouchStartPosition = {
    readonly x: number;
    readonly y: number;
};

/**
 * Type describing the file handler used by Monaco upload interactions.
 */
type HandleFiles = (files: File[]) => Promise<void>;

/**
 * Props for use book editor monaco interactions.
 */
type UseBookEditorMonacoInteractionsProps = {
    readonly editor: editor.IStandaloneCodeEditor | null;
    readonly handleFiles: HandleFiles;
};

/**
 * Result of use book editor monaco interactions.
 */
type UseBookEditorMonacoInteractionsResult = {
    readonly isDragOver: boolean;
    readonly fileUploadInputRef: RefObject<HTMLInputElement | null>;
    readonly cameraInputRef: RefObject<HTMLInputElement | null>;
    readonly handleDrop: (event: DragEvent<HTMLDivElement>) => Promise<void>;
    readonly handlePaste: (event: ClipboardEvent<HTMLDivElement>) => Promise<void>;
    readonly handleUploadDocument: () => void;
    readonly handleTakePhoto: () => void;
    readonly handleFileInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
    readonly handleDragOver: (event: DragEvent<HTMLDivElement>) => void;
    readonly handleDragEnter: (event: DragEvent<HTMLDivElement>) => void;
    readonly handleDragLeave: (event: DragEvent<HTMLDivElement>) => void;
    readonly focusOverlayTouchHandlers: {
        readonly onTouchStart: (event: TouchEvent<HTMLDivElement>) => void;
        readonly onTouchEnd: (event: TouchEvent<HTMLDivElement>) => void;
    };
};

/**
 * Clipboard MIME types treated as rich text documents for upload.
 *
 * @private function of BookEditorMonaco
 */
const RICH_CLIPBOARD_TEXT_MIME_TYPES = new Set(['text/html', 'text/rtf']);

/**
 * Uploaded filename mapping for known rich clipboard MIME types.
 *
 * @private function of BookEditorMonaco
 */
const CLIPBOARD_RICH_CONTENT_FILENAMES: Record<string, string> = {
    'text/html': 'clipboard-content.html',
    'text/rtf': 'clipboard-content.rtf',
    'application/rtf': 'clipboard-content.rtf',
};

/**
 * Fallback filename used when clipboard MIME type is unknown.
 *
 * @private function of BookEditorMonaco
 */
const DEFAULT_CLIPBOARD_RICH_CONTENT_FILENAME = 'clipboard-content.txt';

/**
 * Maximum pointer travel still treated as a tap on the touch focus overlay.
 *
 * @private function of BookEditorMonaco
 */
const TOUCH_TAP_THRESHOLD = 10;

/**
 * Lists transferable items from a browser `DataTransfer` object.
 *
 * @private function of BookEditorMonaco
 */
function listDataTransferItems(dataTransfer: DataTransfer): DataTransferItem[] {
    const items: DataTransferItem[] = [];

    for (let index = 0; index < dataTransfer.items.length; index++) {
        const item = dataTransfer.items[index];
        if (item) {
            items.push(item);
        }
    }

    return items;
}

/**
 * Removes duplicate files by using stable file metadata signature.
 *
 * @private function of BookEditorMonaco
 */
function deduplicateFiles(files: ReadonlyArray<File>): File[] {
    const uniqueFiles = new Map<string, File>();

    for (const file of files) {
        uniqueFiles.set(`${file.name}:${file.type}:${file.size}`, file);
    }

    return Array.from(uniqueFiles.values());
}

/**
 * Extracts all file-like clipboard/drop payloads from a `DataTransfer`.
 *
 * @private function of BookEditorMonaco
 */
function getDataTransferFiles(dataTransfer: DataTransfer): File[] {
    const directFiles = Array.from(dataTransfer.files || []);
    const itemFiles = listDataTransferItems(dataTransfer)
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);

    return deduplicateFiles([...directFiles, ...itemFiles]);
}

/**
 * Picks the richest textual clipboard item that should be uploaded as a document.
 *
 * @private function of BookEditorMonaco
 */
function getRichClipboardTextItem(dataTransfer: DataTransfer): DataTransferItem | null {
    const items = listDataTransferItems(dataTransfer);
    const hasPlainTextItem = items.some((item) => item.kind === 'string' && item.type.toLowerCase() === 'text/plain');

    const applicationItem = items.find(
        (item) => item.kind === 'string' && item.type.toLowerCase().startsWith('application/'),
    );
    if (applicationItem) {
        return applicationItem;
    }

    if (hasPlainTextItem) {
        return null;
    }

    const richTextItem = items.find((item) => {
        if (item.kind !== 'string') {
            return false;
        }

        return RICH_CLIPBOARD_TEXT_MIME_TYPES.has(item.type.toLowerCase());
    });

    return richTextItem || null;
}

/**
 * Resolves whether paste should route into upload workflow instead of text insert.
 *
 * @private function of BookEditorMonaco
 */
function hasUploadableClipboardContent(dataTransfer: DataTransfer): boolean {
    if (getDataTransferFiles(dataTransfer).length > 0) {
        return true;
    }

    return getRichClipboardTextItem(dataTransfer) !== null;
}

/**
 * Reads string payload from clipboard item.
 *
 * @private function of BookEditorMonaco
 */
function getClipboardItemString(item: DataTransferItem): Promise<string> {
    return new Promise((resolve) => {
        try {
            item.getAsString((value) => resolve(value || ''));
        } catch {
            resolve('');
        }
    });
}

/**
 * Determines filename for generated clipboard rich-content uploads.
 *
 * @private function of BookEditorMonaco
 */
function getClipboardRichContentFilename(mimeType: string): string {
    return CLIPBOARD_RICH_CONTENT_FILENAMES[mimeType.toLowerCase()] || DEFAULT_CLIPBOARD_RICH_CONTENT_FILENAME;
}

/**
 * Converts clipboard payload into upload-ready files.
 *
 * @private function of BookEditorMonaco
 */
async function resolveClipboardUploadFiles(dataTransfer: DataTransfer): Promise<File[]> {
    const files = getDataTransferFiles(dataTransfer);
    if (files.length > 0) {
        return files;
    }

    const richTextItem = getRichClipboardTextItem(dataTransfer);
    if (!richTextItem) {
        return [];
    }

    const content = await getClipboardItemString(richTextItem);
    const mimeType = richTextItem.type || 'text/plain';
    if (!content.trim()) {
        return [];
    }

    return [new File([content], getClipboardRichContentFilename(mimeType), { type: mimeType })];
}

/**
 * Manages drag, paste and file input interactions for `BookEditorMonaco`.
 *
 * @private function of BookEditorMonaco
 */
export function useBookEditorMonacoInteractions({
    editor,
    handleFiles,
}: UseBookEditorMonacoInteractionsProps): UseBookEditorMonacoInteractionsResult {
    const [isDragOver, setIsDragOver] = useState(false);
    const touchStartRef = useRef<TouchStartPosition | null>(null);
    const fileUploadInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const handleDrop = useCallback(
        async (event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            setIsDragOver(false);

            const files = getDataTransferFiles(event.dataTransfer);
            await handleFiles(files);
        },
        [handleFiles],
    );

    const handlePaste = useCallback(
        async (event: ClipboardEvent<HTMLDivElement>) => {
            const clipboardData = event.clipboardData;
            if (!hasUploadableClipboardContent(clipboardData)) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            const files = await resolveClipboardUploadFiles(clipboardData);
            await handleFiles(files);
        },
        [handleFiles],
    );

    const handleUploadDocument = useCallback(() => {
        fileUploadInputRef.current?.click();
    }, []);

    const handleTakePhoto = useCallback(() => {
        cameraInputRef.current?.click();
    }, []);

    const handleFileInputChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(event.target.files || []);
            void handleFiles(files);
            event.target.value = '';
        },
        [handleFiles],
    );

    const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleFocusOverlayTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
        const touch = event.touches[0];
        if (touch) {
            touchStartRef.current = { x: touch.clientX, y: touch.clientY };
        }
    }, []);

    const handleFocusOverlayTouchEnd = useCallback(
        (event: TouchEvent<HTMLDivElement>) => {
            event.preventDefault();

            const touch = event.changedTouches[0];
            if (touch && touchStartRef.current) {
                const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
                const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
                if (deltaX < TOUCH_TAP_THRESHOLD && deltaY < TOUCH_TAP_THRESHOLD) {
                    editor?.focus();
                }
            }

            touchStartRef.current = null;
        },
        [editor],
    );

    const focusOverlayTouchHandlers = useMemo(
        () => ({
            onTouchStart: handleFocusOverlayTouchStart,
            onTouchEnd: handleFocusOverlayTouchEnd,
        }),
        [handleFocusOverlayTouchEnd, handleFocusOverlayTouchStart],
    );

    return {
        isDragOver,
        fileUploadInputRef,
        cameraInputRef,
        handleDrop,
        handlePaste,
        handleUploadDocument,
        handleTakePhoto,
        handleFileInputChange,
        handleDragOver,
        handleDragEnter,
        handleDragLeave,
        focusOverlayTouchHandlers,
    };
}
