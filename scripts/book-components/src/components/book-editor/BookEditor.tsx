'use client';

import { DEFAULT_BOOK, getAllCommitmentDefinitions, validateBook } from '@promptbook/core';
import type { string_book } from '@promptbook/types';
import { Libre_Baskerville } from 'next/font/google';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const libreBaskerville = Libre_Baskerville({
    subsets: ['latin'],
    weight: ['400', '700'],
});

interface BookEditorProps {
    /**
     * Additional CSS classes to apply to the editor container.
     */
    className?: string;

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
 */
function escapeHtml(input: string): string {
    return input.replaceAll(/&/g, '&amp;').replaceAll(/</g, '&lt;').replaceAll(/>/g, '&gt;');
}

/**
 * Escape text for safe use inside a RegExp pattern.
 */
function escapeRegex(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Renders a book editor component that allows users to edit a book's content.
 * - Uses Libre Baskerville font with larger readable sizing
 * - Lined paper look with a subtle center fold line
 * - Tall editor area
 * - Highlights commitment keywords (PERSONA, KNOWLEDGE, EXAMPLE, ...) using @promptbook/core helpers
 * - Tailwind CSS styling
 *
 * Note on highlighting:
 * A transparent textarea is overlaid on top of a highlighted <pre>.
 * We sync scroll positions so the highlight stays aligned with typed text.
 */
export default function BookEditor(props: BookEditorProps) {
    const { className = '', value: controlledValue, onChange } = props;
    const [internalValue, setInternalValue] = useState<string_book>(DEFAULT_BOOK);

    const value = controlledValue !== undefined ? controlledValue : internalValue;

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
        const fontsReady: Promise<unknown> | undefined = (document as Document & {
            fonts?: { ready?: Promise<unknown> };
        }).fonts?.ready;
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

    // Build the regex for commitment types using @promptbook/core
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

        text.replace(r, (match, ...args) => {
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
        <div className={`w-full ${className}`}>
            <div
                className={[
                    'relative overflow-hidden rounded-2xl border border-gray-300/80 bg-white shadow-sm focus-within:ring-2 focus-within:ring-indigo-300/40',
                    'transition-shadow duration-200 hover:shadow-md',
                    libreBaskerville.className,
                ].join(' ')}
            >
                {/* Lined paper background */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
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
                    className={[
                        'absolute inset-0 overflow-auto pointer-events-none',
                        'whitespace-pre-wrap',
                        'text-gray-900',
                        'text-lg md:text-xl',
                        'py-6 md:py-8',
                        'pl-[46px] pr-[46px]',
                        // Ensure highlighted text sits below the textarea but remains visible
                        'z-10',
                    ].join(' ')}
                    style={{
                        lineHeight: `${lineHeight}px`,
                        backgroundImage: `linear-gradient(90deg, transparent 30px, rgba(59,130,246,0.3) 30px, rgba(59,130,246,0.3) 31px, transparent 31px), repeating-linear-gradient(0deg, transparent, transparent calc(${lineHeight}px - 1px), rgba(0,0,0,0.06) ${lineHeight}px)`,
                        backgroundAttachment: 'local',
                        backgroundOrigin: 'padding-box, content-box',
                        backgroundClip: 'padding-box, content-box',
                        overflowWrap: 'break-word',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                    }}
                    dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                />

                {/* Editor (transparent text, visible caret) */}
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={handleChange}
                    onScroll={handleScroll}
                    className={[
                        'relative z-20 w-full',
                        // Taller editor area
                        'h-[28rem] md:h-[36rem]',
                        // Typography
                        'text-transparent caret-gray-900 selection:bg-indigo-200/60',
                        'text-lg md:text-xl',
                        libreBaskerville.className,
                        // Layout and visuals
                        'bg-transparent outline-none resize-none',
                        'py-6 md:py-8',
                        'pl-[46px] pr-[46px]',
                    ].join(' ')}
                    style={{ lineHeight: `${lineHeight}px` }}
                    spellCheck={false}
                />
            </div>
        </div>
    );
}
