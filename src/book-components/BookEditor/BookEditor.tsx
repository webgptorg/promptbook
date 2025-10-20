'use client';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Promisable } from 'type-fest';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { DEFAULT_IS_VERBOSE } from '../../config';
import type { string_knowledge_source_content } from '../../types/typeAliases';
import { injectCssModuleIntoShadowRoot } from '../../utils/misc/injectCssModuleIntoShadowRoot';
import { classNames } from '../_common/react-utils/classNames';
import styles from './BookEditor.module.css';
import { BookEditorInner } from './BookEditorInner';

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
     * Callback function to be called when the editor is closed.
     */
    onClose?(): void;
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
        onClose,
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

    // Host div that will get a shadow root
    const hostRef = useRef<HTMLDivElement | null>(null);
    const shadowRootRef = useRef<ShadowRoot | null>(null);
    const [shadowReady, setShadowReady] = useState(false);

    useEffect(() => {
        if (hostRef.current === null) {
            return;
        }

        if (shadowRootRef.current !== null) {
            return;
        }

        const shadowRoot = hostRef.current.attachShadow({ mode: 'open' });
        shadowRootRef.current = shadowRoot;

        // Inject CSS module rules into the shadow root so classes from the module
        // remain available inside the Shadow DOM.
        injectCssModuleIntoShadowRoot({ shadowRoot, styles });

        setShadowReady(true);

        return () => {
            // shadowRootRef.current?.host?.remove();
            // shadowRootRef.current = null;
        };
    }, [hostRef.current]);

    // Build the internal editor JSX (this will be portalled into the shadow root if available)
    const editorInner = (
        <BookEditorInner
            className={className}
            fontClassName={fontClassName}
            value={agentSource || value}
            onChange={onChange}
            onFileUpload={onFileUpload}
            isVerbose={isVerbose}
            isBorderRadiusDisabled={isBorderRadiusDisabled}
            isFooterShown={isFooterShown}
            isReadonly={isReadonly}
            onClose={onClose}
        />
    );

    // Render: host div stays in the light DOM (so page layout is preserved),
    // but the editor internals are portalled into the shadow root for isolation.
    return (
        <div
            data-book-component="BookEditor"
            ref={hostRef}
            className={classNames(styles.BookEditor, isVerbose && styles.isVerbose, className)}
            style={style}
        >
            {shadowReady && shadowRootRef.current ? createPortal(editorInner, shadowRootRef.current) : <>Loading...</>}
        </div>
    );
}

/**
 * TODO: [☁️] Export component prop types only to `@promptbook/components` (not `@promptbook/types`)
 */
