'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { DEFAULT_BOOK, validateBook } from '../../book-2.0/agent-source/string_book';
import { getAllCommitmentDefinitions } from '../../book-2.0/commitments/index';

/**
 * Internal CSS styles for the BookEditor component
 *
 * @private within the BookEditor component
 */
const BOOK_EDITOR_STYLES = `
.book-editor-container {
    width: 100%;
}

.book-editor-wrapper {
    position: relative;
    overflow: hidden;
    border-radius: 1rem;
    border: 1px solid rgba(209, 213, 219, 0.8);
    background-color: white;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    transition: box-shadow 0.2s ease-in-out;
}

.book-editor-wrapper:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.book-editor-wrapper:focus-within {
    outline: 2px solid transparent;
    outline-offset: 2px;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.4);
}

.book-editor-background {
    pointer-events: none;
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
}

.book-editor-highlight {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    overflow: auto;
    pointer-events: none;
    white-space: pre-wrap;
    color: rgb(17, 24, 39);
    font-size: 1.125rem;
    padding: 1.5rem 0;
    padding-left: 46px;
    padding-right: 46px;
    z-index: 10;
    overflow-wrap: break-word;
    scrollbar-width: none;
    -ms-overflow-style: none;
}

.book-editor-highlight::-webkit-scrollbar {
    display: none;
}

.book-editor-highlight .text-indigo-700 {
    color: rgb(67, 56, 202);
}

.book-editor-textarea {
    position: relative;
    z-index: 20;
    width: 100%;
    height: 28rem;
    color: transparent;
    caret-color: rgb(17, 24, 39);
    font-size: 1.125rem;
    background-color: transparent;
    outline: none;
    resize: none;
    padding: 1.5rem 0;
    padding-left: 46px;
    padding-right: 46px;
    border: none;
}

.book-editor-textarea::selection {
    background-color: rgba(99, 102, 241, 0.6);
}

.book-editor-serif {
    font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
}


`;

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

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: BOOK_EDITOR_STYLES }} />
            <div className={`book-editor-container ${className}`} data-book-component="BookEditor">
                <div className={`book-editor-wrapper ${effectiveFontClassName}`}>
                    {/* Lined paper background */}
                    <div
                        aria-hidden
                        className="book-editor-background"
                        // Two background layers:
                        // 1) center fold line
                        // 2) horizontal repeating lines (lined paper)
                        style={{
                            backgroundImage: 'none',
                        }}
                    />
                    {/* Highlight layer */}
                    <pre
                        ref={highlightRef}
                        aria-hidden
                        className={`book-editor-highlight ${effectiveFontClassName}`}
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
                        ref={textareaRef}
                        value={value}
                        onChange={handleChange}
                        onScroll={handleScroll}
                        className={`book-editor-textarea ${effectiveFontClassName}`}
                        style={{ lineHeight: `${lineHeight}px` }}
                        placeholder={DEFAULT_BOOK}
                        spellCheck={false}
                    />
                </div>
            </div>
        </>
    );
}
