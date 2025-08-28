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
const DEFAULT_FONT_CLASS = styles.bookEditorSerif;

// TODO: Split into folders

/**
 * Collect matching CSS texts from document stylesheets for a given class.
 * This will skip cross-origin stylesheets (they throw when accessed).
 *
 * @private within the promptbook components <- TODO: Maybe make promptbook util from this
 */
function collectCssTextsForClass(className: string): string[] {
    const selector = `.${className}`;
    const out: string[] = [];

    for (const sheet of Array.from(document.styleSheets)) {
        try {
            const rules = (sheet as CSSStyleSheet).cssRules;
            for (const r of Array.from(rules)) {
                // STYLE_RULE
                if (r && (r as CSSStyleRule).selectorText) {
                    const sel = (r as CSSStyleRule).selectorText || '';
                    if (sel.indexOf(selector) !== -1) {
                        out.push((r as CSSStyleRule).cssText);
                    }
                } else if ((r as CSSMediaRule).cssRules && (r as CSSMediaRule).conditionText) {
                    // MEDIA_RULE - search inside
                    const media = r as CSSMediaRule;
                    const inner: string[] = [];
                    for (const ir of Array.from(media.cssRules)) {
                        if (
                            ir &&
                            (ir as CSSStyleRule).selectorText &&
                            (ir as CSSStyleRule).selectorText.indexOf(selector) !== -1
                        ) {
                            inner.push((ir as CSSStyleRule).cssText);
                        }
                    }
                    if (inner.length) {
                        out.push(`@media ${media.conditionText} { ${inner.join('\n')} }`);
                    }
                }
            }
        } catch (err) {
            // Could be a cross-origin stylesheet; ignore it.
            // console.debug('skipping stylesheet', err);
        }
    }

    return out;
}

/**
 * Inject the CSS module rules (derived from imported `styles`) into the provided shadow root.
 * This allows CSS modules (which are normally emitted into the document head) to be
 * available inside the component's shadow DOM.
 *
 * @private within the promptbook components <- TODO: Maybe make promptbook util from this
 */
function injectCssModuleIntoShadowRoot(shadowRoot: ShadowRoot) {
    try {
        const classNames = Object.values(styles)
            .flatMap((s) => String(s).split(/\s+/))
            .filter(Boolean);

        const cssParts: string[] = [];
        for (const cn of classNames) {
            cssParts.push(...collectCssTextsForClass(cn));
        }

        const styleEl = document.createElement('style');
        styleEl.setAttribute('data-from', 'BookEditor.module');
        styleEl.textContent = cssParts.join('\n\n');
        shadowRoot.appendChild(styleEl);
    } catch (e) {
        // best-effort: don't crash the component if injection fails
        // console.error('Failed to inject CSS module into shadow root', e);
    }
}

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
 * @private within the promptbook components <- TODO: Maybe make promptbook util from this
 */
function escapeHtml(input: string): string {
    return input.replaceAll(/&/g, '&amp;').replaceAll(/</g, '&lt;').replaceAll(/>/g, '&gt;');
}

/**
 * Escape text for safe use inside a RegExp pattern.
 *
 * @private within the promptbook components <- TODO: Maybe make promptbook util from this
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

        // Inject CSS module rules into the shadow root so classes from the module
        // remain available inside the Shadow DOM.
        injectCssModuleIntoShadowRoot(shadowDom);

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
                        {/* Lined paper background */}
                        <div aria-hidden className={styles.bookEditorBackground} style={{ backgroundImage: 'none' }} />
                        {/* Highlight layer */}
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

                        {/* Editor (transparent text, visible caret) */}
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
