'use client';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import { CSSProperties, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Promisable } from 'type-fest';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { DEFAULT_BOOK } from '../../book-2.0/agent-source/string_book';
import { DEFAULT_IS_VERBOSE } from '../../config';
import type { number_percent, number_positive, string_css_value, string_knowledge_source_content } from '../../types/typeAliases';
import { countLines } from '../../utils/expectation-counters/countLines';
import { classNames } from '../_common/react-utils/classNames';
import styles from './BookEditor.module.css';
import { BookEditorMonaco } from './BookEditorMonaco';

/**
 * Default height of the book editor
 *
 * Note: This height is computed based on the number of lines in the default book + padding multiplied by an estimated line height.
 *
 * @public exported from `@promptbook/components`
 */
export const DEFAULT_BOOK_EDITOR_HEIGHT = countLines(DEFAULT_BOOK) * 30 + 20;

/**
 * Props of `BookEditor`
 *
 * @public exported from `@promptbook/components`
 */
export type BookEditorProps = {
    /**
     * The source of the agent to be displayed in the editor.
     */
    readonly agentSource?: string_book;

    /**
     * Additional CSS classes to apply to the editor container.
     */
    readonly className?: string;

    /**
     * Optional CSS style which will be added to root <div/> element
     */
    readonly style?: CSSProperties;

    /**
     * Height of the `BookEditor` component
     *
     * - You can use any valid CSS value, e.g., `500px`, `100%`, `50vh`, etc.
     * - If not set, the default height is `DEFAULT_BOOK_EDITOR_HEIGHT`.
     * - If set to `null`, the height should be controlled entirely via `className` or `style`, otherwise the editor will have zero height.
     *
     * @default `DEFAULT_BOOK_EDITOR_HEIGHT`
     */
    readonly height?: string_css_value | null;

    /**
     * Zoom level of the editor
     *
     * @default 1 (100%)
     */
    readonly zoom?: number_percent & number_positive;

    /**
     * The book which is being edited.
     */
    readonly value?: string_book;

    /**
     * Callback function to handle changes in the book content.
     */
    onChange?(value: string_book): void;

    /**
     * returns the URL of the uploaded file on CDN or storage
     */
    onFileUpload?(file: File): Promisable<string_knowledge_source_content>;

    /**
     * If true, logs verbose debug info to the console and shows additional visual cues
     */
    readonly isVerbose?: boolean;

    /**
     * If true, disables border radius making the editor have sharp corners
     */
    readonly isBorderRadiusDisabled?: boolean;

    /**
     * If true, the editor is in read-only mode
     *
     * @default false
     */
    readonly isReadonly?: boolean;

    /**
     * Optional translations for the component
     */
    readonly translations?: {
        /**
         * Message to show when trying to edit a readonly editor
         *
         * @default "You cannot edit this book"
         */
        readonly readonlyMessage?: string;
    };

    /**
     * If true, shows the download button in the action bar.
     * By default, the download button is shown.
     */
    readonly isDownloadButtonShown?: boolean;

    /**
     * If true, shows the about button in the action bar.
     * By default, the about button is shown.
     */
    readonly isAboutButtonShown?: boolean;

    /**
     * If true, shows the fullscreen button in the action bar.
     * By default, the fullscreen button is shown.
     */
    readonly isFullscreenButtonShown?: boolean;

    /**
     * Callback function to handle fullscreen button click.
     * Note: This is for internal use between BookEditor and BookEditorMonaco
     * @private
     */
    onFullscreenClick?(): void;

    /**
     * If true, the editor is in fullscreen mode.
     * Note: This is for internal use between BookEditor and BookEditorMonaco
     * @private
     */
    readonly isFullscreen?: boolean;

    /**
     * If defined, the editor will be synced with other editors with the same sync configuration.
     */
    readonly sync?: {
        /**
         * The URL of the y-websocket server.
         */
        readonly serverUrl: string;

        /**
         * The name of the room to join.
         */
        readonly roomName: string;
    };
};

/**
 * Renders a book editor
 *
 * @public exported from `@promptbook/components`
 */
export function BookEditor(props: BookEditorProps) {
    const {
        agentSource,
        className,
        style,
        zoom = 1,
        value,
        onChange,
        onFileUpload,
        isVerbose = DEFAULT_IS_VERBOSE,
        isBorderRadiusDisabled = false,
        isReadonly = false,
        translations,
        isDownloadButtonShown = true,
        isAboutButtonShown = true,
        isFullscreenButtonShown = true,
        sync,
    } = props;

    const [isFullscreen, setIsFullscreen] = useState(false);

    const handleFullscreenToggle = () => {
        setIsFullscreen(!isFullscreen);
    };

    const editorContent = (
        <div
            data-book-component="BookEditor"
            className={classNames(
                styles.BookEditor,
                isVerbose && styles.isVerbose,
                styles.bookEditorWrapper,
                isBorderRadiusDisabled && styles.isBorderRadiusDisabled,
                isFullscreen && styles.fullscreen,
                className,
            )}
            style={
                isFullscreen
                    ? style
                    : {
                          ...(style || {}),
                          ...(props.height === null
                              ? {}
                              : {
                                    height:
                                        typeof props.height === 'number'
                                            ? `${props.height}px`
                                            : props.height || `${DEFAULT_BOOK_EDITOR_HEIGHT}px`,
                                }),
                      }
            }
        >
            <BookEditorMonaco
                value={agentSource || value}
                onChange={onChange}
                onFileUpload={onFileUpload}
                isVerbose={isVerbose}
                isBorderRadiusDisabled={isBorderRadiusDisabled}
                isReadonly={isReadonly}
                translations={translations}
                isDownloadButtonShown={isDownloadButtonShown}
                isAboutButtonShown={isAboutButtonShown}
                isFullscreenButtonShown={isFullscreenButtonShown}
                onFullscreenClick={handleFullscreenToggle}
                isFullscreen={isFullscreen}
                sync={sync}
                zoom={zoom}
            />
        </div>
    );

    return isFullscreen && typeof document !== 'undefined' ? createPortal(editorContent, document.body) : editorContent;
}

/**
 * TODO: [☁️] Export component prop types only to `@promptbook/components` (not `@promptbook/types`)
 */
