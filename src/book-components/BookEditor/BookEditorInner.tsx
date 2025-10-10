import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { DEFAULT_BOOK, validateBook } from '../../book-2.0/agent-source/string_book';
import { getAllCommitmentDefinitions } from '../../book-2.0/commitments/index';
import { DEFAULT_BOOK_TITLE } from '../../config';
/* Removed unused debounce import */
import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../../version';
import { classNames } from '../_common/react-utils/classNames';
import { escapeHtml } from '../_common/react-utils/escapeHtml';
import { escapeRegex } from '../_common/react-utils/escapeRegex';
import type { BookEditorProps } from './BookEditor';
import styles from './BookEditor.module.css';
import { DEFAULT_BOOK_FONT_CLASS } from './config';

/**
 * @private util of `<BookEditor />`
 */
export function BookEditorInner(props: BookEditorProps) {
    const {
        className = '',
        value: controlledValue,
        onChange,
        onFileUpload,
        fontClassName,
        isVerbose = false,
        isBorderRadiusDisabled = false,
        isFooterShown = false,
    } = props;
    const [internalValue, setInternalValue] = useState<string_book>(DEFAULT_BOOK);

    const value = controlledValue !== undefined ? controlledValue : internalValue;
    const effectiveFontClassName = fontClassName || DEFAULT_BOOK_FONT_CLASS;

    const editorRef = useRef<HTMLDivElement>(null);
    const [isDragOver, setIsDragOver] = useState<boolean>(false);
    const [lineHeight, setLineHeight] = useState<number>(32);

    // For contenteditable, virtualization is not needed; show all content.
    const visibleRange: [number, number] = [0, (value ?? '').split('\n').length];

    // Handle input from contenteditable
    const handleInput = useCallback(
        (event: React.FormEvent<HTMLDivElement>) => {
            const newValue = event.currentTarget.innerText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            if (controlledValue !== undefined) {
                onChange?.(validateBook(newValue));
            } else {
                setInternalValue(validateBook(newValue));
            }
        },
        [controlledValue, onChange],
    );

    // Insert text at caret position in contenteditable
    const insertTextAtPosition = useCallback(
        (textToInsert: string, position: number) => {
            const currentValue = value || '';
            const newValue = currentValue.slice(0, position) + textToInsert + currentValue.slice(position);

            if (controlledValue !== undefined) {
                onChange?.(validateBook(newValue));
            } else {
                setInternalValue(validateBook(newValue));
            }

            // Restore selection after DOM update
            setTimeout(() => {
                const el = editorRef.current;
                if (!el) return;
                const range = document.createRange();
                const sel = window.getSelection();
                // Find text node and set caret
                let charIndex = 0;
                let nodeStack: ChildNode[] = [el];
                let found = false;
                while (nodeStack.length && !found) {
                    const node = nodeStack.shift();
                    if (!node) break;
                    if (node.nodeType === Node.TEXT_NODE) {
                        const nextCharIndex = charIndex + node.textContent!.length;
                        if (position >= charIndex && position <= nextCharIndex) {
                            range.setStart(node, position - charIndex);
                            range.collapse(true);
                            found = true;
                            break;
                        }
                        charIndex = nextCharIndex;
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                        nodeStack = Array.from(node.childNodes).concat(nodeStack);
                    }
                }
                if (found && sel) {
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
                el.focus();
            }, 0);
        },
        [value, controlledValue, onChange],
    );

    // Get caret position from mouse coordinates in contenteditable
    const getPositionFromCoordinates = useCallback(
        (clientX: number, clientY: number): number => {
            const el = editorRef.current;
            if (!el) return 0;
            let position = 0;
            const range = document.caretRangeFromPoint
                ? document.caretRangeFromPoint(clientX, clientY)
                : ('caretPositionFromPoint' in document)
                ? (() => {
                      const pos = (document as { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null }).caretPositionFromPoint?.(clientX, clientY);
                      if (!pos) return null;
                      const r = document.createRange();
                      r.setStart(pos.offsetNode, pos.offset);
                      return r;
                  })()
                : null;
            if (range) {
                // Count characters up to range start
                const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
                let charCount = 0;
                let node: Node | null;
                while ((node = walker.nextNode())) {
                    if (node === range.startContainer) {
                        position = charCount + range.startOffset;
                        break;
                    }
                    charCount += node.textContent?.length || 0;
                }
            }
            return Math.max(0, Math.min(position, (value || '').length));
        },
        [value],
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
        async (event: React.DragEvent<HTMLDivElement>) => {
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

    const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (event.currentTarget === event.target) {
            setIsDragOver(false);
        }
    }, []);

    useEffect(() => {
        const el = editorRef.current;
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

    // Comment-like commitments that should be highlighted as gray comments
    const commentCommitmentTypes = useMemo(() => ['NOTE', 'NOTES', 'COMMENT', 'NONCE'], []);

    const commentRegex = useMemo(() => {
        // Pattern to match comment-like commitments (NOTE, NOTES, COMMENT, NONCE) and their content
        // Matches from the commitment keyword until the next line that starts with a commitment or end of text
        const pattern = `(^|\\n)\\s*((?:${commentCommitmentTypes
            .map((t) => escapeRegex(t))
            .join('|')})\\b[^\\n]*(?:\\n(?!\\s*[A-Z]+\\s)[^\\n]*)*?)`;
        return new RegExp(pattern, 'gmi');
    }, [commentCommitmentTypes]);

    const typeRegex = useMemo(() => {
        const allTypes = getAllCommitmentDefinitions().map(({ type }) => String(type));
        // Filter out 'META' and comment-like commitments since we'll handle them specially
        const nonMetaTypes = allTypes.filter((t) => t !== 'META' && !commentCommitmentTypes.includes(t));
        // Only match commitments at the beginning of lines (after newline or at start of text)
        // This follows the same logic as parsing in createCommitmentRegex.ts
        const pattern = `(^|\\n)\\s*(?:${nonMetaTypes.map((t) => escapeRegex(t)).join('|')})\\b`;
        return new RegExp(pattern, 'gmi');
    }, [commentCommitmentTypes]);

    const metaRegex = useMemo(() => {
        // Pattern to match META followed by exactly one uppercase word (DRY principle - single pattern for all META commitments)
        // Only match at the beginning of lines, consistent with other commitments and parsing logic
        // This will match: META IMAGE, META LINK, META TITLE, META DESCRIPTION, META FOO, etc.
        // But NOT multiple words like "META IMAGE SOMETHING" - only "META IMAGE" part will be highlighted
        return /(^|\n)\s*META\s+[A-Z]+\b/gim;
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
    const extractUnifiedParameters = useCallback(
        (text: string) => {
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
        },
        [atParameterRegex, braceParameterRegex],
    );

    // Highlighting logic for contenteditable
    const highlightedHtml = useMemo(() => {
        const text = value ?? '';
        const lines = text.split('\n');
        const [firstLine, lastLine] = visibleRange;
        const visibleLines = lines.slice(firstLine, lastLine);

        // Compute offset for correct line numbers
        const offset = lines.slice(0, firstLine).join('\n').length + (firstLine > 0 ? 1 : 0);

        let out = '';
        const processedRanges: Array<{
            start: number;
            end: number;
            type: 'keyword' | 'parameter' | 'comment';
        }> = [];

        // Highlighting logic for all lines (no virtualization)
        const visibleText = visibleLines.join('\n');

        // First, handle comment-like commitments (NOTE, COMMENT, NONCE)
        visibleText.replace(commentRegex, (match: string, ...args: unknown[]) => {
            const index = (args[args.length - 2] as number) + offset;
            const adjustedStart = match.startsWith('\n') ? index + 1 : index;
            const adjustedMatch = match.startsWith('\n') ? match.slice(1) : match;
            processedRanges.push({ start: adjustedStart, end: adjustedStart + adjustedMatch.length, type: 'comment' });
            return match;
        });

        // META commitments
        visibleText.replace(metaRegex, (match: string, ...args: unknown[]) => {
            const index = (args[args.length - 2] as number) + offset;
            const adjustedStart = match.startsWith('\n') ? index + 1 : index;
            const adjustedMatch = match.startsWith('\n') ? match.slice(1) : match;
            const matchEnd = adjustedStart + adjustedMatch.length;
            const overlaps = processedRanges.some(
                (range) =>
                    (adjustedStart >= range.start && adjustedStart < range.end) ||
                    (matchEnd > range.start && matchEnd <= range.end) ||
                    (adjustedStart < range.start && matchEnd > range.end),
            );
            if (!overlaps) {
                processedRanges.push({ start: adjustedStart, end: matchEnd, type: 'keyword' });
            }
            return match;
        });

        // Regular commitment types
        visibleText.replace(typeRegex, (match: string, ...args: unknown[]) => {
            const index = (args[args.length - 2] as number) + offset;
            const adjustedStart = match.startsWith('\n') ? index + 1 : index;
            const adjustedMatch = match.startsWith('\n') ? match.slice(1) : match;
            const matchEnd = adjustedStart + adjustedMatch.length;
            const overlaps = processedRanges.some(
                (range) =>
                    (adjustedStart >= range.start && adjustedStart < range.end) ||
                    (matchEnd > range.start && matchEnd <= range.end) ||
                    (adjustedStart < range.start && matchEnd > range.end),
            );
            if (!overlaps) {
                processedRanges.push({ start: adjustedStart, end: matchEnd, type: 'keyword' });
            }
            return match;
        });

        // Parameters
        const unifiedParameters = extractUnifiedParameters(visibleText);
        unifiedParameters.forEach((param) => {
            const paramStart = param.start + offset;
            const paramEnd = param.end + offset;
            const overlaps = processedRanges.some(
                (range) =>
                    (paramStart >= range.start && paramStart < range.end) ||
                    (paramEnd > range.start && paramEnd <= range.end) ||
                    (paramStart < range.start && paramEnd > range.end),
            );
            if (!overlaps) {
                processedRanges.push({
                    start: paramStart,
                    end: paramEnd,
                    type: 'parameter',
                });
            }
        });

        // Sort ranges by start position
        processedRanges.sort((a, b) => a.start - b.start);

        // Build the highlighted HTML for all lines
        let visibleLastIndex = offset;
        processedRanges.forEach((range) => {
            out += escapeHtml(text.slice(visibleLastIndex, range.start));
            const matchText = text.slice(range.start, range.end);
            let cssClass: string;
            switch (range.type) {
                case 'keyword':
                    cssClass = 'book-highlight-keyword';
                    break;
                case 'parameter':
                    cssClass = 'book-highlight-parameter';
                    break;
                case 'comment':
                    cssClass = 'book-highlight-comment';
                    break;
                default:
                    cssClass = 'book-highlight-keyword';
                    break;
            }
            out += `<span class="${cssClass}">${escapeHtml(matchText)}</span>`;
            visibleLastIndex = range.end;
        });
        out += escapeHtml(text.slice(visibleLastIndex, offset + visibleText.length));

        const resultLines = out.split('\n').slice(firstLine, lastLine);
        if (resultLines.length > 0 && firstLine === 0) {
            resultLines[0] = `<span class="book-highlight-title">${resultLines[0]}</span>`;
        }
        return resultLines.join('<br>');
    }, [value, typeRegex, metaRegex, extractUnifiedParameters, visibleRange]);

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
                <div
                    id="book"
                    ref={editorRef}
                    className={`${styles.bookEditorHighlight} ${effectiveFontClassName}${isDragOver ? ' ' + styles.isDragOver : ''}`}
                    contentEditable
                    suppressContentEditableWarning
                    spellCheck={false}
                    style={{
                        lineHeight: `${lineHeight}px`,
                        backgroundImage: `linear-gradient(90deg, transparent 30px, rgba(59,130,246,0.3) 30px, rgba(59,130,246,0.3) 31px, transparent 31px), repeating-linear-gradient(0deg, transparent, transparent calc(${lineHeight}px - 1px), rgba(0,0,0,0.06) ${lineHeight}px)`,
                        backgroundAttachment: 'local',
                        backgroundOrigin: 'padding-box, content-box',
                        backgroundClip: 'padding-box, content-box',
                        outline: 'none',
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'break-word',
                    }}
                    onInput={handleInput}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                    aria-label="Book editor"
                />
                {isFooterShown && (
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
                )}
            </div>
        </div>
    );
}
