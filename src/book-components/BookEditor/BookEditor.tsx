'use client';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import type { CSSProperties } from 'react';
import type { Promisable } from 'type-fest';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { DEFAULT_IS_VERBOSE } from '../../config';
import type { string_knowledge_source_content } from '../../types/typeAliases';
import { classNames } from '../_common/react-utils/classNames';
import styles from './BookEditor.module.css';
import { BookEditorMonaco } from './BookEditorMonaco';

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
     * CSS className for a font (e.g. from next/font) to style the editor text.
     * If omitted, defaults to system serif fonts.
     */
    readonly fontClassName?: string;

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
     * If true, shows the footer with book title and version information.
     * By default, the footer is hidden.
     */
    readonly isFooterShown?: boolean;

    /**
     * If true, the editor is in read-only mode
     *
     * @default false
     */
    readonly isReadonly?: boolean;
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
        value,
        onChange,
        onFileUpload,
        fontClassName,
        isVerbose = DEFAULT_IS_VERBOSE,
        isBorderRadiusDisabled = false,
        isFooterShown = false,
        isReadonly = false,
    } = props;

    return (
        <div
            data-book-component="BookEditor"
            className={classNames(
                styles.BookEditor,
                isVerbose && styles.isVerbose,
                styles.bookEditorWrapper,
                isBorderRadiusDisabled && styles.isBorderRadiusDisabled,

                className,
            )}
            style={style}
        >
            <BookEditorMonaco
                className={className}
                fontClassName={fontClassName}
                value={agentSource || value}
                onChange={onChange}
                onFileUpload={onFileUpload}
                isVerbose={isVerbose}
                isBorderRadiusDisabled={isBorderRadiusDisabled}
                isFooterShown={isFooterShown}
                isReadonly={isReadonly}
            />
        </div>
    );
}

/**
 * TODO: [☁️] Export component prop types only to `@promptbook/components` (not `@promptbook/types`)
 */
