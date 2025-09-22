import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Promisable } from 'type-fest';
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
    // TODO: !!!! Derive from BookEditorProps
    className?: string;
    fontClassName?: string;
    value?: string_book;
    onChange?(value: string_book): void;
    onFileUpload?(file: File): Promisable<string>;
    isVerbose?: boolean;
    isBorderRadiusDisabled?: boolean;
};

/**
 * @private util of `<BookEditor />`
 */
export function BookEditorInner(props: BookEditorInnerProps) {
    const {
        className = '',
        value: controlledValue,
        onChange,
        onFileUpload,
        fontClassName,
        isVerbose = false,
        isBorderRadiusDisabled = false,
    } = props;
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

    const insertTextAtPosition = useCallback(
        (textToInsert: string, position: number) => {
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
        },
        [value, controlledValue, onChange],
    );

    const getPositionFromCoordinates = useCallback(
        (clientX: number, clientY: number): number => {
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
                    position += Math.min(columnNumber, lines[i]!.length);
                    break;
                } else {
                    position += lines[i]!.length + 1; // +1 for newline character
                }
            }

            // If we're beyond the last line, position at the end
            if (lineNumber >= lines.length) {
                position = (value || '').length;
            }

            return Math.max(0, Math.min(position, (value || '').length));
        },
        [value, lineHeight],
    );

    /**
     * Checks if the drop position is at the beginning of a line
     */
    const smartInsertIsAtLineStart = useCallback((position: number, textContent: string): boolean => {
        if (position === 0) return true;

        // Check if the character before the position is a newline
        return textContent[position - 1] === '\n';
    }, []);

    /**
     * Checks if any of the upload results contains multiple lines
     */
    const smartInsertHasMultilineContent = useCallback((results: string[]): boolean => {
        return results.some((result) => result.includes('\n'));
    }, []);

    /**
     * Handles smart insertion for inline drops (middle of text)
     * - If all results are single-line: insert separated by spaces
     * - If any result is multiline: behave like line-start insertion
     */
    const smartInsertInlineContent = useCallback(
        (results: string[], position: number): void => {
            const hasMultiline = smartInsertHasMultilineContent(results);

            if (hasMultiline) {
                // If any result is multiline, treat as line-start insertion
                smartInsertAtLineStart(results, position);
                return;
            }

            // All results are single-line: insert separated by spaces
            const textToInsert = results.join(' ');
            insertTextAtPosition(textToInsert, position);
        },
        [smartInsertHasMultilineContent, insertTextAtPosition],
    );

    /**
     * Handles smart insertion for line-start drops
     * Each result gets its own line with "KNOWLEDGE " prefix
     */
    const smartInsertAtLineStart = useCallback(
        (results: string[], position: number): void => {
            const lines: string[] = [];

            // Process each upload result
            results.forEach((result) => {
                if (result.includes('\n')) {
                    // Multiline content: add "KNOWLEDGE" prefix only to first line
                    const resultLines = result.split('\n');
                    if (resultLines.length > 0) {
                        lines.push(`KNOWLEDGE ${resultLines[0]}`);
                        // Add remaining lines without prefix
                        if (resultLines.length > 1) {
                            lines.push(...resultLines.slice(1));
                        }
                    }
                } else {
                    // Single-line content: add with "KNOWLEDGE " prefix
                    lines.push(`KNOWLEDGE ${result}`);
                }
            });

            // Join all lines and ensure proper spacing
            const textToInsert = lines.join('\n');

            // If we're not at position 0 and the previous character isn't already a newline,
            // add a newline before our content
            const textContent = value || '';
            const needsLeadingNewline = position > 0 && textContent[position - 1] !== '\n';
            const finalTextToInsert = needsLeadingNewline ? '\n' + textToInsert : textToInsert;

            insertTextAtPosition(finalTextToInsert, position);
        },
        [value, insertTextAtPosition],
    );

    /**
     * Main smart insertion logic that determines insertion strategy based on drop position
     */
    const smartInsertUploadedContent = useCallback(
        (results: string[], dropPosition: number): void => {
            const textContent = value || '';
            const isAtLineStart = smartInsertIsAtLineStart(dropPosition, textContent);

            if (isAtLineStart) {
                // Scenario 2: Drop at line start - use formatted insertion
                smartInsertAtLineStart(results, dropPosition);
            } else {
                // Scenario 1: Drop inline - check content type and insert accordingly
                smartInsertInlineContent(results, dropPosition);
            }
        },
        [value, smartInsertIsAtLineStart, smartInsertAtLineStart, smartInsertInlineContent],
    );

    const handleDrop = useCallback(
        async (event: React.DragEvent<HTMLTextAreaElement>) => {
            event.preventDefault();
            setIsDragOver(false);

            if (!onFileUpload) return;

            const files = Array.from(event.dataTransfer.files);
            if (files.length === 0) return;

            try {
                // Upload all files in parallel
                const uploadPromises = files.map((file) => onFileUpload(file));
                const uploadResults = await Promise.all(uploadPromises);

                // Calculate drop position based on coordinates
                const dropPosition = getPositionFromCoordinates(event.clientX, event.clientY);

                // Use smart insertion logic to handle the uploaded content
                smartInsertUploadedContent(uploadResults, dropPosition);
            } catch (error) {
                console.error('File upload failed:', error);
            }
        },
        [onFileUpload, getPositionFromCoordinates, smartInsertUploadedContent],
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
        // Filter out 'META' from regular commitments since we'll handle it specially
        const nonMetaTypes = allTypes.filter((t) => t !== 'META');
        const pattern = `\\b(?:${nonMetaTypes.map((t) => escapeRegex(t)).join('|')})\\b`;
        return new RegExp(pattern, 'gmi');
    }, []);

    const metaRegex = useMemo(() => {
        // Pattern to match META followed by exactly one uppercase word (DRY principle - single pattern for all META commitments)
        // This will match: META IMAGE, META LINK, META TITLE, META DESCRIPTION, META FOO, etc.
        // But NOT multiple words like "META IMAGE SOMETHING" - only "META IMAGE" part will be highlighted
        return /\bMETA\s+[A-Z]+\b/gim;
    }, []);

    // [🧠] Parameter syntax highlighting - unified approach for two different notations of the same syntax feature
    //
    // IMPORTANT PRINCIPLE: The Book language supports parameters as a single syntax feature
    // expressed through two different notations:
    // 1. @Parameter (single word parameters starting with @) - e.g., @name, @ěščřžý
    // 2. {parameterName} (parameters in braces) - e.g., {name}, {user name}, {name: description}
    //
    // Both notations represent the same semantic concept - parameters - and should be:
    // - Highlighted with the same color (purple)
    // - Parsed using the same logic
    // - Treated identically in the syntax processing
    //
    // This follows the DRY principle: don't repeat yourself for the same syntax feature.
    const atParameterRegex = useMemo(() => {
        // Match @followed by word characters (letters, numbers, underscore) and unicode letters (for @ěščřžý)
        return /@[\w\u00C0-\u017F\u0100-\u024F\u1E00-\u1EFF]+/gim;
    }, []);

    const braceParameterRegex = useMemo(() => {
        // Match {parameter} or {parameter: description} - content inside braces
        return /\{[^}]+\}/gim;
    }, []);

    /**
     * Unified parameter extraction function that handles both parameter notations
     *
     * This function embodies the principle that @Parameter and {parameter} are
     * two different notations for the same syntax feature - parameters.
     *
     * @param text - Text to extract parameters from
     * @returns Array of parameter ranges with unified type
     */
    const extractUnifiedParameters = useCallback((text: string) => {
        const parameters: Array<{
            start: number;
            end: number;
            type: 'parameter'; // Same type for both notations
            notation: 'at' | 'brace'; // Track which notation was used
            text: string;
        }> = [];

        // Extract @Parameter notation (first notation)
        text.replace(atParameterRegex, (match: string, ...args: unknown[]) => {
            const index = args[args.length - 2] as number;
            parameters.push({
                start: index,
                end: index + match.length,
                type: 'parameter', // Same semantic meaning
                notation: 'at',
                text: match,
            });
            return match;
        });

        // Extract {parameter} notation (second notation)
        text.replace(braceParameterRegex, (match: string, ...args: unknown[]) => {
            const index = args[args.length - 2] as number;
            parameters.push({
                start: index,
                end: index + match.length,
                type: 'parameter', // Same semantic meaning
                notation: 'brace',
                text: match,
            });
            return match;
        });

        return parameters.sort((a, b) => a.start - b.start);
    }, [atParameterRegex, braceParameterRegex]);

    const highlightedHtml = useMemo(() => {
        const text = value ?? '';

        let lastIndex = 0;
        let out = '';
        const processedRanges: Array<{
            start: number;
            end: number;
            type: 'keyword' | 'parameter';
        }> = [];

        // First, handle META commitments (they take priority)
        text.replace(metaRegex, (match: string, ...args: unknown[]) => {
            const index = args[args.length - 2] as number;
            processedRanges.push({ start: index, end: index + match.length, type: 'keyword' });
            return match;
        });

        // Then handle regular commitment types, avoiding overlaps with META ranges
        text.replace(typeRegex, (match: string, ...args: unknown[]) => {
            const index = args[args.length - 2] as number;
            const matchEnd = index + match.length;

            // Check if this match overlaps with any existing range
            const overlaps = processedRanges.some(
                (range) =>
                    (index >= range.start && index < range.end) ||
                    (matchEnd > range.start && matchEnd <= range.end) ||
                    (index < range.start && matchEnd > range.end),
            );

            if (!overlaps) {
                processedRanges.push({ start: index, end: matchEnd, type: 'keyword' });
            }
            return match;
        });

        // Handle parameters using the unified extraction function - both @Parameter and {parameter} notations
        // are treated as the same syntax feature with unified highlighting
        const unifiedParameters = extractUnifiedParameters(text);
        unifiedParameters.forEach((param) => {
            // Check if this parameter overlaps with any existing range
            const overlaps = processedRanges.some(
                (range) =>
                    (param.start >= range.start && param.start < range.end) ||
                    (param.end > range.start && param.end <= range.end) ||
                    (param.start < range.start && param.end > range.end),
            );

            if (!overlaps) {
                processedRanges.push({
                    start: param.start,
                    end: param.end,
                    type: 'parameter'
                });
            }
        });

        // Sort ranges by start position
        processedRanges.sort((a, b) => a.start - b.start);

        // Build the highlighted HTML
        processedRanges.forEach((range) => {
            // Add text before this range
            out += escapeHtml(text.slice(lastIndex, range.start));

            // Add highlighted text with appropriate class
            const matchText = text.slice(range.start, range.end);
            let cssClass: string;
            switch (range.type) {
                case 'keyword':
                    cssClass = 'book-highlight-keyword';
                    break;
                case 'parameter':
                    // Use the unified parameter class, but maintain backward compatibility
                    cssClass = 'book-highlight-parameter';
                    break;
                default:
                    cssClass = 'book-highlight-keyword';
                    break;
            }
            out += `<span class="${cssClass}">${escapeHtml(matchText)}</span>`;

            lastIndex = range.end;
        });

        // Add remaining text
        out += escapeHtml(text.slice(lastIndex));

        const lines = out.split('\n');
        if (lines.length > 0) {
            lines[0] = `<span class="book-highlight-title">${lines[0]}</span>`;
        }
        return lines.join('\n');
    }, [value, typeRegex, metaRegex, extractUnifiedParameters]);

    return (
        <div className={classNames(styles.bookEditorContainer, isVerbose && styles.isVerbose, className)}>
            <div
                className={classNames(
                    styles.bookEditorWrapper,
                    effectiveFontClassName,
                    isBorderRadiusDisabled && styles.isBorderRadiusDisabled,
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
                    className={`${styles.bookEditorTextarea} ${effectiveFontClassName}${
                        isDragOver ? ' ' + styles.isDragOver : ''
                    }`}
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
