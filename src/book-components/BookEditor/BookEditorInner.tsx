import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { DEFAULT_BOOK, validateBook } from '../../book-2.0/agent-source/string_book';
import { getAllCommitmentDefinitions } from '../../book-2.0/commitments/index';
import { DEFAULT_BOOK_TITLE } from '../../config';
import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../../version';
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
    onFileUpload?(file: File): Promise<string>;
    isVerbose?: boolean;
    isBorderRadiusDisabled?: boolean;
};

/**
 * @private util of `<BookEditor />`
 */
export function BookEditorInner(props: BookEditorInnerProps) {
    const { className = '', value: controlledValue, onChange, onFileUpload, fontClassName, isVerbose = false, isBorderRadiusDisabled = false } = props;
    const [internalValue, setInternalValue] = useState<string_book>(DEFAULT_BOOK);

    const value = controlledValue !== undefined ? controlledValue : internalValue;
    const effectiveFontClassName = fontClassName || DEFAULT_BOOK_FONT_CLASS;

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const highlightRef = useRef<HTMLPreElement>(null);

    const [lineHeight, setLineHeight] = useState<number>(32);
    const [isDragOver, setIsDragOver] = useState<boolean>(false);

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


    const insertTextAtPosition = useCallback((textToInsert: string, position: number) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const currentValue = value || '';
        const newValue = currentValue.slice(0, position) + textToInsert + currentValue.slice(position);

        if (controlledValue !== undefined) {
            onChange?.(validateBook(newValue));
        } else {
            setInternalValue(validateBook(newValue));
        }

        // Select the inserted text
        setTimeout(() => {
            textarea.setSelectionRange(position, position + textToInsert.length);
            textarea.focus();
        }, 0);
    }, [value, controlledValue, onChange]);

    const getPositionFromCoordinates = useCallback((clientX: number, clientY: number): number => {
        const textarea = textareaRef.current;
        if (!textarea) return 0;

        const rect = textarea.getBoundingClientRect();
        const relativeX = clientX - rect.left;
        const relativeY = clientY - rect.top;

        // Account for scrolling
        const scrollLeft = textarea.scrollLeft;
        const scrollTop = textarea.scrollTop;

        const adjustedX = relativeX + scrollLeft;
        const adjustedY = relativeY + scrollTop;

        // Get computed styles to calculate character dimensions
        const computedStyle = window.getComputedStyle(textarea);
        const paddingLeft = parseInt(computedStyle.paddingLeft, 10) || 0;
        const paddingTop = parseInt(computedStyle.paddingTop, 10) || 0;

        // Adjust for padding
        const textX = Math.max(0, adjustedX - paddingLeft);
        const textY = Math.max(0, adjustedY - paddingTop);

        // Estimate line and column based on font metrics
        const lineNumber = Math.floor(textY / lineHeight);

        // Create a temporary span to measure character width
        const span = document.createElement('span');
        span.style.font = computedStyle.font;
        span.style.fontSize = computedStyle.fontSize;
        span.style.fontFamily = computedStyle.fontFamily;
        span.style.position = 'absolute';
        span.style.visibility = 'hidden';
        span.textContent = 'W'; // Use a typical character for width estimation
        document.body.appendChild(span);
        const charWidth = span.getBoundingClientRect().width;
        document.body.removeChild(span);

        const columnNumber = Math.round(textX / charWidth);

        // Convert line and column to character position
        const lines = (value || '').split('\n');
        let position = 0;

        for (let i = 0; i < Math.min(lineNumber, lines.length); i++) {
            if (i === lineNumber) {
                position += Math.min(columnNumber, lines[i].length);
                break;
            } else {
                position += lines[i].length + 1; // +1 for newline character
            }
        }

        // If we're beyond the last line, position at the end
        if (lineNumber >= lines.length) {
            position = (value || '').length;
        }

        return Math.max(0, Math.min(position, (value || '').length));
    }, [value, lineHeight]);

    const handleDrop = useCallback(
        async (event: React.DragEvent<HTMLTextAreaElement>) => {
            event.preventDefault();
            setIsDragOver(false);

            if (!onFileUpload) return;

            const files = Array.from(event.dataTransfer.files);
            if (files.length === 0) return;

            // Get the drop position from coordinates
            const dropPosition = getPositionFromCoordinates(event.clientX, event.clientY);

            try {
                // Handle multiple files in parallel
                const uploadPromises = files.map((file) => onFileUpload(file));
                const urls = await Promise.all(uploadPromises);

                // Insert all URLs separated by spaces at drop position
                const urlsText = urls.join(' ');
                insertTextAtPosition(urlsText, dropPosition);
            } catch (error) {
                console.error('File upload failed:', error);
            }
        },
        [onFileUpload, insertTextAtPosition, getPositionFromCoordinates],
    );

    const handleDragOver = useCallback((event: React.DragEvent<HTMLTextAreaElement>) => {
        event.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragEnter = useCallback((event: React.DragEvent<HTMLTextAreaElement>) => {
        event.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((event: React.DragEvent<HTMLTextAreaElement>) => {
        event.preventDefault();
        // Only set drag over to false if we're leaving the textarea itself, not a child element
        if (event.currentTarget === event.target) {
            setIsDragOver(false);
        }
    }, []);

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
            <div
                className={classNames(
                    styles.bookEditorWrapper,
                    effectiveFontClassName,
                    isBorderRadiusDisabled && styles.isBorderRadiusDisabled
                )}
            >
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
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    className={`${styles.bookEditorTextarea} ${effectiveFontClassName}${isDragOver ? ' ' + styles.isDragOver : ''}`}
                    style={{ lineHeight: `${lineHeight}px` }}
                    placeholder={DEFAULT_BOOK}
                    spellCheck={false}
                />
                <div className={styles.bookEditorBar}>
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
