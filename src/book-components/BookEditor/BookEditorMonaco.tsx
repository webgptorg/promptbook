'use client';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import { useMonaco } from '@monaco-editor/react';
import { useId } from 'react';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { MonacoEditorWithShadowDom } from '../_common/MonacoEditorWithShadowDom';
import { classNames } from '../_common/react-utils/classNames';
import { SaveIcon } from '../icons/SaveIcon';
import type { BookEditorProps } from './BookEditor';
import styles from './BookEditor.module.css';
import { BookEditorActionbar } from './BookEditorActionbar';
import { BookEditorMonacoConstants } from './BookEditorMonacoConstants';
import { createDeprecatedCommitmentDiagnostics } from './createDeprecatedCommitmentDiagnostics';
import { useBookEditorMonacoDecorations } from './useBookEditorMonacoDecorations';
import { useBookEditorMonacoDiagnostics } from './useBookEditorMonacoDiagnostics';
import { useBookEditorMonacoInteractions } from './useBookEditorMonacoInteractions';
import { useBookEditorMonacoLanguage } from './useBookEditorMonacoLanguage';
import { useBookEditorMonacoLifecycle } from './useBookEditorMonacoLifecycle';
import { useBookEditorMonacoStyles } from './useBookEditorMonacoStyles';
import { useBookEditorMonacoUploads } from './useBookEditorMonacoUploads';
import { BookEditorMonacoUploadPanel } from './BookEditorMonacoUploadPanel';

/**
 * Matches characters that are unsafe in CSS identifiers and HTML IDs.
 *
 * @private Internal utility of `BookEditorMonaco`.
 */
const INVALID_CSS_IDENTIFIER_CHARACTER_PATTERN = /[^a-zA-Z0-9_-]/g;

/**
 * Base Book editor font size before zoom scaling.
 *
 * @private Internal utility of `BookEditorMonaco`.
 */
const BASE_FONT_SIZE = 20;

/**
 * Minimum supported Book editor font size after zoom scaling.
 *
 * @private Internal utility of `BookEditorMonaco`.
 */
const MIN_FONT_SIZE = 8;

/**
 * Default Monaco scrollbar size before zoom scaling.
 *
 * @private Internal utility of `BookEditorMonaco`.
 */
const BASE_SCROLLBAR_SIZE = 5;

/**
 * Minimum Monaco scrollbar size after zoom scaling.
 *
 * @private Internal utility of `BookEditorMonaco`.
 */
const MIN_SCROLLBAR_SIZE = 2;

/**
 * Minimum left padding Monaco reserves for custom line decorations.
 *
 * @private Internal utility of `BookEditorMonaco`.
 */
const MIN_CONTENT_PADDING_LEFT = 8;

/**
 * Scaled Monaco presentation values derived from the Book editor zoom level.
 *
 * @private Internal utility of `BookEditorMonaco`.
 */
type BookEditorMonacoScale = {
    readonly scaledLineHeight: number;
    readonly scaledContentPaddingLeft: number;
    readonly scaledVerticalLineLeft: number;
    readonly scaledFontSize: number;
    readonly scaledScrollbarSize: number;
};

/**
 * Props used to determine whether the Book editor action bar should render.
 *
 * @private Internal utility of `BookEditorMonaco`.
 */
type BookEditorMonacoActionbarVisibilityProps = Pick<
    BookEditorProps,
    | 'hoistedMenuItems'
    | 'isUploadButtonShown'
    | 'isCameraButtonShown'
    | 'isDownloadButtonShown'
    | 'isAboutButtonShown'
    | 'isFullscreenButtonShown'
>;

/**
 * Props used to build Monaco options for `BookEditorMonaco`.
 *
 * @private Internal utility of `BookEditorMonaco`.
 */
type CreateBookEditorMonacoOptionsProps = Pick<BookEditorProps, 'isReadonly' | 'translations'> &
    Pick<
        BookEditorMonacoScale,
        'scaledFontSize' | 'scaledLineHeight' | 'scaledContentPaddingLeft' | 'scaledScrollbarSize'
    >;

/**
 * Creates a hydration-stable CSS class name from React's `useId()` value.
 *
 * @private Internal utility of `BookEditorMonaco`.
 */
function createStableBookEditorInstanceClassName(reactId: string): string {
    return `book-editor-instance-${reactId.replace(INVALID_CSS_IDENTIFIER_CHARACTER_PATTERN, '-')}`;
}

/**
 * Resolves Monaco layout values from the active Book editor zoom level.
 *
 * @private Internal utility of `BookEditorMonaco`.
 */
function createBookEditorMonacoScale(zoomLevel: number): BookEditorMonacoScale {
    return {
        scaledLineHeight: Math.round(BookEditorMonacoConstants.LINE_HEIGHT * zoomLevel),
        scaledContentPaddingLeft: Math.max(
            MIN_CONTENT_PADDING_LEFT,
            Math.round(BookEditorMonacoConstants.CONTENT_PADDING_LEFT * zoomLevel),
        ),
        scaledVerticalLineLeft: Math.max(0, Math.round(BookEditorMonacoConstants.VERTICAL_LINE_LEFT * zoomLevel)),
        scaledFontSize: Math.max(MIN_FONT_SIZE, Math.round(BASE_FONT_SIZE * zoomLevel)),
        scaledScrollbarSize: Math.max(MIN_SCROLLBAR_SIZE, Math.round(BASE_SCROLLBAR_SIZE * zoomLevel)),
    };
}

/**
 * Determines whether the Book editor action bar should be shown.
 *
 * @private Internal utility of `BookEditorMonaco`.
 */
function isBookEditorMonacoActionbarVisible({
    hoistedMenuItems,
    isUploadButtonShown,
    isCameraButtonShown,
    isDownloadButtonShown,
    isAboutButtonShown,
    isFullscreenButtonShown,
}: BookEditorMonacoActionbarVisibilityProps): boolean {
    return (
        Boolean(hoistedMenuItems && hoistedMenuItems.length > 0) ||
        Boolean(isUploadButtonShown) ||
        Boolean(isCameraButtonShown) ||
        Boolean(isDownloadButtonShown) ||
        Boolean(isAboutButtonShown) ||
        Boolean(isFullscreenButtonShown)
    );
}

/**
 * Builds the Monaco editor options consumed by `MonacoEditorWithShadowDom`.
 *
 * @private Internal utility of `BookEditorMonaco`.
 */
function createBookEditorMonacoOptions({
    isReadonly,
    translations,
    scaledFontSize,
    scaledLineHeight,
    scaledContentPaddingLeft,
    scaledScrollbarSize,
}: CreateBookEditorMonacoOptionsProps) {
    return {
        readOnly: isReadonly,
        readOnlyMessage: {
            value: translations?.readonlyMessage || 'You cannot edit this book',
        },
        wordWrap: 'on' as const,
        minimap: { enabled: false },
        lineNumbers: 'off' as const,
        fontSize: scaledFontSize,
        fontFamily: `"Playfair Display", serif`,
        lineHeight: scaledLineHeight,
        renderLineHighlight: 'none' as const,
        lineDecorationsWidth: scaledContentPaddingLeft,
        glyphMargin: false,
        folding: false,
        lineNumbersMinChars: 0,
        links: true,
        scrollbar: {
            vertical: 'auto' as const,
            horizontal: 'hidden' as const,
            verticalScrollbarSize: scaledScrollbarSize,
            arrowSize: 0,
            useShadows: false,
        },
    };
}

/**
 * Handles book editor monaco.
 *
 * @private Internal component used by `BookEditor`
 */
export function BookEditorMonaco(props: BookEditorProps) {
    const {
        value,
        onChange,
        diagnostics,
        isReadonly,
        theme = 'LIGHT',
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
        monacoModelPath,
        hoistedMenuItems,
    } = props;

    const zoomLevel = zoom;
    const { scaledLineHeight, scaledContentPaddingLeft, scaledVerticalLineLeft, scaledFontSize, scaledScrollbarSize } =
        createBookEditorMonacoScale(zoomLevel);
    const monaco = useMonaco();

    const reactId = useId();
    const instanceClass = createStableBookEditorInstanceClassName(reactId);

    const { editor, isFocused, isTouchDevice, isSavedShown, handleBeforeMonacoMount, handleMonacoMount } =
        useBookEditorMonacoLifecycle({
            monaco,
            theme,
        });

    const { activeUploadItems, uploadStats, pauseUpload, resumeUpload, handleFiles } = useBookEditorMonacoUploads({
        editor,
        monaco,
        onFileUpload,
    });
    const {
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
    } = useBookEditorMonacoInteractions({
        editor,
        handleFiles,
    });
    const combinedDiagnostics = [...(diagnostics || []), ...createDeprecatedCommitmentDiagnostics(value)];
    const isActionBarVisible = isBookEditorMonacoActionbarVisible({
        hoistedMenuItems,
        isUploadButtonShown,
        isCameraButtonShown,
        isDownloadButtonShown,
        isAboutButtonShown,
        isFullscreenButtonShown,
    });
    const monacoOptions = createBookEditorMonacoOptions({
        isReadonly,
        translations,
        scaledFontSize,
        scaledLineHeight,
        scaledContentPaddingLeft,
        scaledScrollbarSize,
    });

    useBookEditorMonacoLanguage({ monaco, theme });
    useBookEditorMonacoDiagnostics({ monaco, editor, diagnostics: combinedDiagnostics });
    useBookEditorMonacoDecorations({ editor, monaco });
    useBookEditorMonacoStyles({
        instanceClass,
        scaledContentPaddingLeft,
        scaledLineHeight,
        scaledVerticalLineLeft,
        zoomLevel,
        theme,
    });

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
                        hoistedMenuItems,
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
                <MonacoEditorWithShadowDom
                    language={BookEditorMonacoConstants.BOOK_LANGUAGE_ID}
                    theme={BookEditorMonacoConstants.BOOK_THEME_ID}
                    path={monacoModelPath}
                    saveViewState={Boolean(monacoModelPath)}
                    value={value}
                    beforeMount={handleBeforeMonacoMount}
                    onMount={handleMonacoMount}
                    onChange={(newValue) => onChange?.(newValue as string_book)}
                    options={monacoOptions}
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
