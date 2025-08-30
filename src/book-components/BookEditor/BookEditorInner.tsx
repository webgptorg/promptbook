import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { DEFAULT_BOOK } from '../../book-2.0/agent-source/string_book';
import { validateBook } from '../../book-2.0/agent-source/string_book';
import { getAllCommitmentDefinitions } from '../../book-2.0/commitments/index';
import { DEFAULT_BOOK_TITLE } from '../../config';
import { BOOK_LANGUAGE_VERSION } from '../../version';
import { PROMPTBOOK_ENGINE_VERSION } from '../../version';
import { classNames } from '../_common/react-utils/classNames';
import { escapeHtml } from '../_common/react-utils/escapeHtml';
import { escapeRegex } from '../_common/react-utils/escapeRegex';
import styles from './BookEditor.module.css';
import { DEFAULT_BOOK_FONT_CLASS } from './config';

/**
 * @private util of `<BookEditor />`
 */
export type BookEditorInnerProps = {
    className?: string;
    fontClassName?: string;
    value?: string_book;
    onChange?(value: string_book): void;
    isVerbose?: boolean;
};

/**
 * @private util of `<BookEditor />`
 */
export function BookEditorInner(props: BookEditorInnerProps) {
    const { className = '', value: controlledValue, onChange, fontClassName, isVerbose = false } = props;
    const [internalValue, setInternalValue] = useState<string_book>(DEFAULT_BOOK);

    const value = controlledValue !== undefined ? controlledValue : internalValue;
    const effectiveFontClassName = fontClassName || DEFAULT_BOOK_FONT_CLASS;

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

        measure();

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

        window.addEventListener('resize', measure);
        return () => {
            window.removeEventListener('resize', measure);
        };
    }, []);

    const typeRegex = useMemo(() => {
        const allTypes = getAllCommitmentDefinitions().map(({ type }) => String(type));
        const pattern = `\\b(?:${allTypes.map((t) => escapeRegex(t)).join('|')})\\b`;
        return new RegExp(pattern, 'gmi');
    }, []);

    const highlightedHtml = useMemo(() => {
        const text = value ?? '';
        const r = typeRegex;

        let lastIndex = 0;
        let out = '';

        text.replace(r, (match: string, ...args: unknown[]) => {
            const index = args[args.length - 2] as number;
            out += escapeHtml(text.slice(lastIndex, index));
            out += `<span class="book-highlight-keyword">${escapeHtml(match)}</span>`;
            lastIndex = index + match.length;
            return match;
        });

        out += escapeHtml(text.slice(lastIndex));

        const lines = out.split('\n');
        if (lines.length > 0) {
            lines[0] = `<span class="book-highlight-title">${lines[0]}</span>`;
        }
        return lines.join('\n');
    }, [value, typeRegex]);

    return (
        <div className={classNames(styles.bookEditorContainer, isVerbose && styles.isVerbose, className)}>
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
    );
}
