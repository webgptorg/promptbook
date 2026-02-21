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

            const files = Array.from(event.dataTransfer.files);
            await handleFiles(files);
        },
        [handleFiles],
    );

    const handlePaste = useCallback(
        async (event: ClipboardEvent<HTMLDivElement>) => {
            const files = Array.from(event.clipboardData.files);

            if (files.length === 0) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

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
