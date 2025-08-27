import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { DEFAULT_BOOK, validateBook } from '../../book-2.0/agent-source/string_book';
import { getAllCommitmentDefinitions } from '../../book-2.0/commitments/index';
import { DEFAULT_BOOK_TITLE } from '../../config';
import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../../version';
import styles from './BookEditor.module.css';

/**
 * Default font class name for the BookEditor component
 * In Next.js environments, you can override this by importing the font directly
 * @private within the BookEditor component
 */
const DEFAULT_FONT_CLASS = 'book-editor-serif';

export interface BookEditorProps {
    /**
     * Additional CSS classes to apply to the editor container.
     */
    className?: string;

    /**
     * CSS className for a font (e.g. from next/font) to style the editor text.
     * If omitted, defaults to system serif fonts.
     */
    fontClassName?: string;

    /**
     * The book which is being edited.
     */
    value?: string_book;

    /**
     * Callback function to handle changes in the book content.
     */
    onChange?: (value: string_book) => void;
}

/**
 * Escape HTML to safely render user text inside a <pre> with dangerouslySetInnerHTML.
 *
 * @private within the BookEditor component
 */
function escapeHtml(input: string): string {
    return input.replaceAll(/&/g, '&amp;').replaceAll(/</g, '&lt;').replaceAll(/>/g, '&gt;');
}

/**
 * Escape text for safe use inside a RegExp pattern.
 *
 * @private within the BookEditor component
 */
function escapeRegex(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Renders a book editor
 *
 * @public exported from `@promptbook/components`
 */
export function BookEditor(props: BookEditorProps) {
    const { className = '', value: controlledValue, onChange, fontClassName } = props;
    const [internalValue, setInternalValue] = useState<string_book>(DEFAULT_BOOK);

    const value = controlledValue !== undefined ? controlledValue : internalValue;

    // Use provided fontClassName or fallback to default serif font
    const effectiveFontClassName = fontClassName || DEFAULT_FONT_CLASS;

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const highlightRef = useRef<HTMLPreElement>(null);

    const [lineHeight, setLineHeight] = useState<number>(32);

    const handleChange = useCallback(
        (event: React.ChangeEvent<HTMLTextAreaElement>) => {
            const newValue = event.target.value;
            if (controlledValue !== undefined) {
                onChange?.(validateBook(newValue));
            } else {
                setInternalValue(validateBook(newValue));
            }
        },
        [controlledValue, onChange],
    );

    const handleScroll = useCallback((event: React.UIEvent<HTMLTextAreaElement>) => {
        const t = event.currentTarget;
        if (highlightRef.current) {
            highlightRef.current.scrollTop = t.scrollTop;
            highlightRef.current.scrollLeft = t.scrollLeft;
        }
    }, []);

    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;

        const measure = () => {
            const cs = window.getComputedStyle(el);
            const lh = parseFloat(cs.lineHeight || '0');
            if (!Number.isNaN(lh) && lh > 0) {
                setLineHeight(lh);
            }
        };

        // Initial measure
        measure();

        // Re-measure after fonts load (metrics can change once font renders)
        const fontsReady: Promise<unknown> | undefined = (
            document as Document & {
                fonts?: { ready?: Promise<unknown> };
            }
        ).fonts?.ready;
        if (fontsReady && typeof (fontsReady as Promise<unknown>).then === 'function') {
            fontsReady
                .then(() => {
                    measure();
                })
                .catch(() => {
                    /* ignore */
                });
        }

        // Re-measure on resize
        window.addEventListener('resize', measure);
        return () => {
            window.removeEventListener('resize', measure);
        };
    }, []);

    // Build the regex for commitment types
    const typeRegex = useMemo(() => {
        const allTypes = getAllCommitmentDefinitions().map(({ type }) => String(type));
        const pattern = `\\b(?:${allTypes.map((t) => escapeRegex(t)).join('|')})\\b`;
        return new RegExp(pattern, 'gmi');
    }, []);

    // Generate highlighted HTML version of the current text
    const highlightedHtml = useMemo(() => {
        const text = value ?? '';
        const r = typeRegex;

        let lastIndex = 0;
        let out = '';

        text.replace(r, (match: string, ...args: unknown[]) => {
            const index = args[args.length - 2] as number; // offset
            out += escapeHtml(text.slice(lastIndex, index));
            out += `<span class="text-indigo-700">${escapeHtml(match)}</span>`;
            lastIndex = index + match.length;
            return match;
        });

        out += escapeHtml(text.slice(lastIndex));
        return out;
    }, [value, typeRegex]);

    // Host div that will get a shadow root
    const hostRef = useRef<HTMLDivElement | null>(null);
    const shadowRootRef = useRef<ShadowRoot | null>(null);

    useEffect(() => {
        if (hostRef.current === null) {
            console.log('!!! 1');
            return;
        }

        if (shadowRootRef.current !== null) {
            console.log('!!! 2');
            return;
        }

        const shadowDom = hostRef.current.attachShadow({ mode: 'open' });
        shadowRootRef.current = shadowDom;

        return () => {
            // shadowRootRef.current?.host?.remove();
            // shadowRootRef.current = null;
        };
    }, [hostRef.current]);

    // Build the internal editor JSX (this will be portalled into the shadow root if available)
    const editorInner = useMemo(
        () => (
            <>
                <div className={styles.bookEditorContainer}>
                    <div className={`${styles.bookEditorWrapper} ${effectiveFontClassName}`}>
                        <div aria-hidden className={styles.bookEditorBackground} style={{ backgroundImage: 'none' }} />
                        <pre
                            ref={highlightRef}
                            aria-hidden
                            className={`${styles.bookEditorHighlight} ${effectiveFontClassName}`}
                            style={{
                                lineHeight: `${lineHeight}px`,
                                backgroundImage: `linear-gradient(90deg, transparent 30px, rgba(59,130,246,0.3) 30px, rgba(59,130,246,0.3) 31px, transparent 31px), repeating-linear-gradient(0deg, transparent, transparent calc(${lineHeight}px - 1px), rgba(0,0,0,0.06) ${lineHeight}px)`,
                                backgroundAttachment: 'local',
                                backgroundOrigin: 'padding-box, content-box',
                                backgroundClip: 'padding-box, content-box',
                            }}
                            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                        />
                        <textarea
                            id="book"
                            ref={textareaRef}
                            value={value}
                            onChange={handleChange}
                            onScroll={handleScroll}
                            className={`${styles.bookEditorTextarea} ${effectiveFontClassName}`}
                            style={{ lineHeight: `${lineHeight}px` }}
                            placeholder={DEFAULT_BOOK}
                            spellCheck={false}
                        />
                        <div className={styles.bookEditorVersion}>
                            {value.split('\n', 2)[0] || DEFAULT_BOOK_TITLE}
                            {' | '}
                            <a
                                href="https://github.com/webgptorg/book"
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Book Language Version ${BOOK_LANGUAGE_VERSION}`}
                            >
                                📖 {BOOK_LANGUAGE_VERSION}
                            </a>
                            {' | '}
                            <a
                                href="https://github.com/webgptorg/promptbook"
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Promptbook Engine Version ${PROMPTBOOK_ENGINE_VERSION}`}
                            >
                                🏭 {PROMPTBOOK_ENGINE_VERSION}
                            </a>
                        </div>
                    </div>
                </div>
            </>
        ),
        [highlightedHtml, effectiveFontClassName, lineHeight],
    );

    const [nonce, setNonce] = useState(0);

    useEffect(() => {
        console.log('!!! setting nonce');
        setNonce(1);
    }, []);

    // Render: host div stays in the light DOM (so page layout is preserved),
    // but the editor internals are portalled into the shadow root for isolation.
    return (
        <div data-book-component="BookEditor" data-nonce={nonce} ref={hostRef} className={className}>
            {shadowRootRef.current === null ? <>Loading...</> : createPortal(editorInner, shadowRootRef.current)}
        </div>
    );
}
