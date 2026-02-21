'use client';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import Editor, { useMonaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import {
    type ChangeEvent,
    type ClipboardEvent,
    type DragEvent,
    type TouchEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { classNames } from '../_common/react-utils/classNames';
import { SaveIcon } from '../icons/SaveIcon';
import type { BookEditorProps } from './BookEditor';
import styles from './BookEditor.module.css';
import { BookEditorActionbar } from './BookEditorActionbar';
import { BookEditorMonacoConstants } from './BookEditorMonacoConstants';
import { useBookEditorMonacoDecorations } from './useBookEditorMonacoDecorations';
import { useBookEditorMonacoDiagnostics } from './useBookEditorMonacoDiagnostics';
import { useBookEditorMonacoLanguage } from './useBookEditorMonacoLanguage';
import { useBookEditorMonacoStyles } from './useBookEditorMonacoStyles';
import { useBookEditorMonacoUploads } from './useBookEditorMonacoUploads';
import { BookEditorMonacoUploadPanel } from './BookEditorMonacoUploadPanel';

let notebookStyleCounter = 0;

/**
 * Clipboard MIME types treated as rich text documents for upload.
 *
 * @private Internal utility of `BookEditorMonaco`.
 */
const RICH_CLIPBOARD_TEXT_MIME_TYPES = new Set(['text/html', 'text/rtf']);

/**
 * Uploaded filename mapping for known rich clipboard MIME types.
 *
 * @private Internal utility of `BookEditorMonaco`.
 */
const CLIPBOARD_RICH_CONTENT_FILENAMES: Record<string, string> = {
    'text/html': 'clipboard-content.html',
    'text/rtf': 'clipboard-content.rtf',
    'application/rtf': 'clipboard-content.rtf',
};

/**
 * Fallback filename used when clipboard MIME type is unknown.
 *
 * @private Internal utility of `BookEditorMonaco`.
 */
const DEFAULT_CLIPBOARD_RICH_CONTENT_FILENAME = 'clipboard-content.txt';

/**
 * Lists transferable items from a browser `DataTransfer` object.
 *
 * @private Internal utility of `BookEditorMonaco`.
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
 * @private Internal utility of `BookEditorMonaco`.
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
 * @private Internal utility of `BookEditorMonaco`.
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
 * @private Internal utility of `BookEditorMonaco`.
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

    if (richTextItem) {
        return richTextItem;
    }

    return null;
}

/**
 * Resolves whether paste should route into upload workflow instead of text insert.
 *
 * @private Internal utility of `BookEditorMonaco`.
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
 * @private Internal utility of `BookEditorMonaco`.
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
 * @private Internal utility of `BookEditorMonaco`.
 */
function getClipboardRichContentFilename(mimeType: string): string {
    return CLIPBOARD_RICH_CONTENT_FILENAMES[mimeType.toLowerCase()] || DEFAULT_CLIPBOARD_RICH_CONTENT_FILENAME;
}

/**
 * Converts clipboard payload into upload-ready files.
 *
 * @private Internal utility of `BookEditorMonaco`.
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
 * @private Internal component used by `BookEditor`
 */
export function BookEditorMonaco(props: BookEditorProps) {
    const {
        value,
        onChange,
        diagnostics,
        isReadonly,
        translations,
        onFileUpload,
        isUploadButtonShown,
        isCameraButtonShown,
        isDownloadButtonShown,
        isAboutButtonShown = true,
        isFullscreenButtonShown = true,
        onFullscreenClick,
        isFullscreen,
        zoom = 1,
    } = props;

    const zoomLevel = zoom;
    const scaledLineHeight = Math.round(BookEditorMonacoConstants.LINE_HEIGHT * zoomLevel);
    const scaledContentPaddingLeft = Math.max(
        8,
        Math.round(BookEditorMonacoConstants.CONTENT_PADDING_LEFT * zoomLevel),
    );
    const scaledVerticalLineLeft = Math.max(0, Math.round(BookEditorMonacoConstants.VERTICAL_LINE_LEFT * zoomLevel));
    const baseFontSize = 20;
    const scaledFontSize = Math.max(8, Math.round(baseFontSize * zoomLevel));
    const scaledScrollbarSize = Math.max(2, Math.round(5 * zoomLevel));

    const [isDragOver, setIsDragOver] = useState(false);
    const [editor, setEditor] = useState<editor.IStandaloneCodeEditor | null>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [isSavedShown, setIsSavedShown] = useState(false);

    const monaco = useMonaco();

    const instanceIdRef = useRef(++notebookStyleCounter);
    const instanceClass = `book-editor-instance-${instanceIdRef.current}`;

    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const fileUploadInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const { activeUploadItems, uploadStats, pauseUpload, resumeUpload, handleFiles } = useBookEditorMonacoUploads({
        editor,
        monaco,
        onFileUpload,
    });

    useBookEditorMonacoLanguage({ monaco });
    useBookEditorMonacoDiagnostics({ monaco, editor, diagnostics });
    useBookEditorMonacoDecorations({ editor, monaco });
    useBookEditorMonacoStyles({
        instanceClass,
        scaledContentPaddingLeft,
        scaledLineHeight,
        scaledVerticalLineLeft,
        zoomLevel,
    });

    useEffect(() => {
        setIsTouchDevice(typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches);
    }, []);

    useEffect(() => {
        if (!editor) {
            return;
        }

        const focusListener = editor.onDidFocusEditorWidget(() => {
            setIsFocused(true);
        });

        const blurListener = editor.onDidBlurEditorWidget(() => {
            setIsFocused(false);
        });

        const saveAction = editor.addAction({
            id: 'save-book',
            label: 'Save',
            keybindings: [monaco!.KeyMod.CtrlCmd | monaco!.KeyCode.KeyS],
            run: () => {
                setIsSavedShown(false);
                setTimeout(() => setIsSavedShown(true), 0);
                // Note: We don't prevent default, so browser's save dialog still opens
            },
        });

        return () => {
            focusListener.dispose();
            blurListener.dispose();
            saveAction.dispose();
        };
    }, [editor, monaco]);

    useEffect(() => {
        if (!isSavedShown) {
            return;
        }

        const timer = setTimeout(() => {
            setIsSavedShown(false);
        }, 2000);

        return () => {
            clearTimeout(timer);
        };
    }, [isSavedShown]);

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

    const focusOverlayTouchHandlers = {
        onTouchStart: (event: TouchEvent<HTMLDivElement>) => {
            const touch = event.touches[0];
            if (touch) {
                touchStartRef.current = { x: touch.clientX, y: touch.clientY };
            }
        },
        onTouchEnd: (event: TouchEvent<HTMLDivElement>) => {
            event.preventDefault();
            const touch = event.changedTouches[0];
            if (touch && touchStartRef.current) {
                const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
                const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
                const threshold = 10;
                if (deltaX < threshold && deltaY < threshold) {
                    editor?.focus();
                }
            }
            touchStartRef.current = null;
        },
    };

    const isActionBarVisible =
        isUploadButtonShown ||
        isCameraButtonShown ||
        isDownloadButtonShown ||
        isAboutButtonShown ||
        isFullscreenButtonShown;

    return (
        <div
            className={classNames(styles.bookEditorContainer, instanceClass)}
            onDrop={handleDrop}
            onPaste={handlePaste}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
        >
            {isActionBarVisible && (
                <BookEditorActionbar
                    {...{
                        value,
                        isUploadButtonShown,
                        isCameraButtonShown: isCameraButtonShown ?? isTouchDevice,
                        isDownloadButtonShown,
                        isAboutButtonShown,
                        isFullscreenButtonShown,
                        onFullscreenClick,
                        onUploadDocument: handleUploadDocument,
                        onTakePhoto: handleTakePhoto,
                        isFullscreen,
                    }}
                />
            )}
            <input
                type="file"
                ref={fileUploadInputRef}
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
                multiple
            />
            <input
                type="file"
                ref={cameraInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                capture="environment"
                onChange={handleFileInputChange}
            />
            {isDragOver && <div className={styles.dropOverlay}>Drop files to upload</div>}
            {isSavedShown && (
                <div className={styles.savedNotification}>
                    <SaveIcon />
                    Saved
                </div>
            )}
            <BookEditorMonacoUploadPanel
                activeUploadItems={activeUploadItems}
                uploadStats={uploadStats}
                pauseUpload={pauseUpload}
                resumeUpload={resumeUpload}
            />
            <div
                style={{
                    position: 'relative',
                    flex: 1,
                    height: '100%',
                    width: '100%',
                }}
            >
                {isTouchDevice && !isFocused && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 20,
                            height: '100%',
                            width: '100%',
                            backgroundColor: 'transparent',
                        }}
                        {...focusOverlayTouchHandlers}
                    />
                )}
                <Editor
                    language={BookEditorMonacoConstants.BOOK_LANGUAGE_ID}
                    value={value}
                    onMount={(mountedEditor) => setEditor(mountedEditor)}
                    onChange={(newValue) => onChange?.(newValue as string_book)}
                    options={{
                        readOnly: isReadonly,
                        readOnlyMessage: {
                            value: translations?.readonlyMessage || 'You cannot edit this book',
                        },
                        wordWrap: 'on',
                        minimap: { enabled: false },
                        lineNumbers: 'off',
                        fontSize: scaledFontSize,
                        fontFamily: `"Playfair Display", serif`,
                        lineHeight: scaledLineHeight,
                        renderLineHighlight: 'none',
                        lineDecorationsWidth: scaledContentPaddingLeft,
                        glyphMargin: false,
                        folding: false,
                        lineNumbersMinChars: 0,
                        links: true,
                        scrollbar: {
                            vertical: 'auto',
                            horizontal: 'hidden',
                            verticalScrollbarSize: scaledScrollbarSize,
                            arrowSize: 0,
                            useShadows: false,
                        },
                    }}
                    loading={
                        <div className={styles.loading}>
                            📖{/* <- TODO: [🐱‍🚀] Better visual of loading of `<BookEditor/>` */}
                        </div>
                    }
                />
            </div>
        </div>
    );
}
