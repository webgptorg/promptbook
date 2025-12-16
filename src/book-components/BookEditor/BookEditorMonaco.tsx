'use client';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import Editor, { useMonaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { useCallback, useEffect, useRef, useState } from 'react'; // <-- added useRef
// [🚱]> import { MonacoBinding } from 'y-monaco';
// [🚱]> import { WebsocketProvider } from 'y-websocket';
// [🚱]> import * as Y from 'yjs';
// [🚱]> import { TODO_any } from '../../_packages/types.index';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { getAllCommitmentDefinitions } from '../../commitments/index';
import { PROMPTBOOK_SYNTAX_COLORS } from '../../config';
import { classNames } from '../_common/react-utils/classNames';
import type { BookEditorProps } from './BookEditor';
import styles from './BookEditor.module.css';
import { BookEditorActionbar } from './BookEditorActionbar';

const BOOK_LANGUAGE_ID = 'book';
const LINE_HEIGHT = 28;
const CONTENT_PADDING_LEFT = 20;
const VERTICAL_LINE_LEFT = 0; // <- TODO: This value is weird

/**
 * @private Internal component used by `BookEditor`
 */
let notebookStyleCounter = 0;

/**
 * @private Internal component used by `BookEditor`
 */
export function BookEditorMonaco(props: BookEditorProps) {
    const {
        value,
        onChange,
        isReadonly,
        translations,
        onFileUpload,
        isUploadButtonShown,
        isCameraButtonShown,
        isDownloadButtonShown,
        isAboutButtonShown = true,
        isFullscreenButtonShown = true,
        onFullscreenClick,
        isFullscreen,
        zoom = 1,
        // [🚱]> sync,
    } = props;

    const zoomLevel = zoom;

    const scaledLineHeight = Math.round(LINE_HEIGHT * zoomLevel);
    const scaledContentPaddingLeft = Math.max(8, Math.round(CONTENT_PADDING_LEFT * zoomLevel));
    const scaledVerticalLineLeft = Math.max(0, Math.round(VERTICAL_LINE_LEFT * zoomLevel));
    const baseFontSize = 20;
    const scaledFontSize = Math.max(8, Math.round(baseFontSize * zoomLevel));
    const scaledScrollbarSize = Math.max(2, Math.round(5 * zoomLevel));

    const [isDragOver, setIsDragOver] = useState(false);
    const [editor, setEditor] = useState<editor.IStandaloneCodeEditor | null>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    const monaco = useMonaco();

    // stable unique id for this instance
    const instanceIdRef = useRef(++notebookStyleCounter);
    const instanceClass = `book-editor-instance-${instanceIdRef.current}`;

    // [1] Track touch start position to differentiate tap from drag
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

    const fileUploadInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    /*
    Note+TODO: [🚱] Yjs logic is commented out because it causes errors in the build of Next.js projects:
             > ▲ Next.js 15.4.5
             > - Experiments (use with caution):
             >     ✓ externalDir
             >
             > Creating an optimized production build ...
             > ✓ Compiled successfully in 17.0s
             > ✓ Linting and checking validity of types    
             > ✓ Collecting page data    
             > Error occurred prerendering page "/". Read more: https://nextjs.org/docs/messages/prerender-error
             > ReferenceError: window is not defined
             >     at 27132 (C:\Users\me\work\ai\promptbook\apps\book-components\.next\server\chunks\134.js:1:525485)
             >     at c (C:\Users\me\work\ai\promptbook\apps\book-components\.next\server\webpack-runtime.js:1:128)
             >     at 89192 (C:\Users\me\work\ai\promptbook\apps\book-components\.next\server\chunks\462.js:711:10466)
             >     at Object.c [as require] (C:\Users\me\work\ai\promptbook\apps\book-components\.next\server\webpack-runtime.js:1:128) {
             > digest: '2500543835'
             > }
             > Export encountered an error on /page: /, exiting the build.
             > ⨯ Next.js build worker exited with code: 1 and signal: null


    const [editor, setEditor] = useState<TODO_any>(null);
      
    useEffect(() => {
        if (!monaco || !editor || !sync) {
            return;
        }

        const ydoc = new Y.Doc();
        const provider = new WebsocketProvider(sync.serverUrl, sync.roomName, ydoc);
        const ytext = ydoc.getText('monaco');

        const binding = new MonacoBinding(ytext, editor.getModel(), new Set([editor]), provider.awareness);

        return () => {
            binding.destroy();
            provider.destroy();
        };
    }, [monaco, editor, sync]);
    */

    useEffect(() => {
        // Note: Test on client side only
        setIsTouchDevice(typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches);
    }, []);

    useEffect(() => {
        if (!editor) {
            return;
        }

        const focusListener = editor.onDidFocusEditorWidget(() => {
            setIsFocused(true);
        });

        const blurListener = editor.onDidBlurEditorWidget(() => {
            setIsFocused(false);
        });

        return () => {
            focusListener.dispose();
            blurListener.dispose();
        };
    }, [editor]);

    useEffect(() => {
        if (!monaco) {
            return;
        }

        // Register a new language
        monaco.languages.register({ id: BOOK_LANGUAGE_ID });

        const commitmentTypes = [...new Set(getAllCommitmentDefinitions().map(({ type }) => type))];
        const commitmentRegex = new RegExp(
            `^(${commitmentTypes.map((type) => (type === 'META' ? 'META\\s+\\w+' : type)).join('|')})`,
        );

        // Note: Using a broad character set for Latin and Cyrillic to support international characters in parameters.
        //       Monarch tokenizer does not support Unicode property escapes like \p{L}.
        const parameterRegex = /@([a-zA-Z0-9_á-žÁ-Žč-řČ-Řš-žŠ-Žа-яА-ЯёЁ]+)/;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bookRules: any = [
            [/^---[-]*$/, ''], // Horizontal lines get no highlighting
            [parameterRegex, 'parameter'],
            [/\{[^}]+\}/, 'parameter'],
            [commitmentRegex, 'commitment'],
        ];

        // Register a tokens provider for the language
        const tokenProvider = monaco.languages.setMonarchTokensProvider(BOOK_LANGUAGE_ID, {
            ignoreCase: true,
            tokenizer: {
                root: [
                    [/^\s*$/, 'empty'], // Empty token whitespace lines
                    [/^-*$/, 'line'], // Horizontal lines get no highlighting
                    [/^.*$/, 'title', '@body'], // First non-empty, non-horizontal line is title
                    [commitmentRegex, 'commitment'],
                ],
                body: bookRules,
            },
        });

        // Register a completion item provider for the language
        const completionProvider = monaco.languages.registerCompletionItemProvider(BOOK_LANGUAGE_ID, {
            provideCompletionItems: (model, position) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn,
                };

                const suggestions = commitmentTypes.map((type) => ({
                    label: type,
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: type,
                    range: range,
                }));

                return { suggestions: suggestions };
            },
        });

        monaco.editor.defineTheme('book-theme', {
            base: 'vs',
            inherit: true,
            rules: [
                {
                    token: 'title',
                    foreground: PROMPTBOOK_SYNTAX_COLORS.TITLE.toHex(),
                    // [🚚]> fontStyle: 'underline italic',
                    fontStyle: 'bold underline',
                },
                {
                    token: 'commitment',
                    foreground: PROMPTBOOK_SYNTAX_COLORS.COMMITMENT.toHex(),
                    fontStyle: 'bold',
                },
                {
                    token: 'parameter',
                    foreground: PROMPTBOOK_SYNTAX_COLORS.PARAMETER.toHex(),
                    fontStyle: `italic`,
                },
            ],
            colors: {
                'editor.scrollbarSlider.background': '#E0E0E0',
                'editor.scrollbarSlider.hoverBackground': '#D0D0D0',
                'editor.scrollbarSlider.activeBackground': '#C0C0C0',
            },
        });

        monaco.editor.setTheme('book-theme');

        return () => {
            tokenProvider.dispose();
            completionProvider.dispose();
        };
    }, [monaco]);

    useEffect(() => {
        const styleId = `notebook-margin-line-style-${instanceIdRef.current}`; // <-- unique per instance

        let style = document.getElementById(styleId) as HTMLStyleElement | null;
        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            document.head.appendChild(style);
        }

        style.innerHTML = `

            @import url('https://fonts.googleapis.com/css2?family=Bitcount+Grid+Single:wght@100..900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
            /* <- [🚚] */

            .${instanceClass} .monaco-editor .view-lines {
                background-image: linear-gradient(to bottom, transparent ${
                    scaledLineHeight - 1
                }px, ${PROMPTBOOK_SYNTAX_COLORS.LINE.toHex()} ${scaledLineHeight - 1}px);
                background-size: calc(100% + ${scaledContentPaddingLeft}px) ${scaledLineHeight}px;
                background-position-x: -${scaledContentPaddingLeft}px;
                background-position-y: ${scaledLineHeight * -0.1}px;
            }
            .${instanceClass} .monaco-editor .overflow-guard::before {
                content: '';
                position: absolute;
                left: ${scaledVerticalLineLeft}px;
                top: 0;
                bottom: 0;
                width: 1px;
                background-color: ${PROMPTBOOK_SYNTAX_COLORS.LINE.toHex()};
                z-index: 10;
            }

            .${instanceClass} .monaco-editor .separator-line {
                background: linear-gradient(
                    to bottom, 
                    transparent ${scaledLineHeight * 0.9 - 2}px, 
                    ${PROMPTBOOK_SYNTAX_COLORS.SEPARATOR.toHex()} ${scaledLineHeight * 0.9 - 2}px, 
                    ${PROMPTBOOK_SYNTAX_COLORS.SEPARATOR.toHex()} ${scaledLineHeight * 0.9 + 1}px, 
                    transparent ${scaledLineHeight * 0.9 + 1}px
                );
            }
            
            .${instanceClass} .monaco-editor .transparent-text {
                color: transparent !important;
            }
        `;

        return () => {
            // Note: Style is not removed on purpose to avoid flickering during development with fast refresh
        };
    }, [scaledLineHeight, scaledContentPaddingLeft, scaledVerticalLineLeft]);

    const decorationIdsRef = useRef<string[]>([]);

    useEffect(() => {
        if (!editor || !monaco) {
            return;
        }

        const updateDecorations = () => {
            const model = editor.getModel();
            if (!model) {
                return;
            }

            const text = model.getValue();
            const matches = text.matchAll(/^---[-]*$/gm);
            const newDecorations: editor.IModelDeltaDecoration[] = [];

            for (const match of matches) {
                if (match.index === undefined) {
                    continue;
                }

                const startPos = model.getPositionAt(match.index);
                const endPos = model.getPositionAt(match.index + match[0].length);

                newDecorations.push({
                    range: new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
                    options: {
                        isWholeLine: true,
                        className: 'separator-line',
                        inlineClassName: 'transparent-text',
                    },
                });
            }

            decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, newDecorations);
        };

        updateDecorations();

        const changeListener = editor.onDidChangeModelContent(() => {
            updateDecorations();
        });

        return () => {
            changeListener.dispose();
        };
    }, [editor, monaco]);

    const handleFiles = useCallback(
        async (files: File[]) => {
            if (!onFileUpload) return;
            if (files.length === 0) return;

            // [1] Inject placeholders
            const placeholders = files.map((file) => `KNOWLEDGE ⏳ Uploading ${file.name}...`);
            const currentValue = value || '';
            const valueWithPlaceholders = currentValue + '\n' + placeholders.join('\n');
            onChange?.(valueWithPlaceholders as string_book);

            try {
                // [2] Upload files one by one and replace placeholders
                // Note: We are uploading in parallel
                await Promise.all(
                    files.map(async (file, index) => {
                        const placeholder = placeholders[index]!;
                        try {
                            const fileSrc = await onFileUpload(file);
                            const completedText = `KNOWLEDGE ${fileSrc}`;

                            // Note: We need to get the latest value from the editor to avoid overwriting other changes
                            const latestValue = editor?.getValue() || '';
                            const newValue = latestValue.split(placeholder).join(completedText);

                            if (latestValue !== newValue) {
                                onChange?.(newValue as string_book);
                            }
                        } catch (error) {
                            console.error(`File upload failed for ${file.name}:`, error);

                            // Note: In case of error, we remove the placeholder
                            const latestValue = editor?.getValue() || '';
                            const newValue = latestValue
                                .split(placeholder)
                                .join(`KNOWLEDGE ❌ Failed to upload ${file.name}`);

                            if (latestValue !== newValue) {
                                onChange?.(newValue as string_book);
                            }
                        }
                    }),
                );
            } catch (error) {
                console.error('File upload failed:', error);
            }
        },
        [onFileUpload, value, onChange, editor],
    );

    const handleDrop = useCallback(
        async (event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            setIsDragOver(false);

            const files = Array.from(event.dataTransfer.files);
            await handleFiles(files);
        },
        [handleFiles],
    );

    const handleUploadDocument = useCallback(() => {
        if (fileUploadInputRef.current) {
            fileUploadInputRef.current.click();
        }
    }, []);

    const handleTakePhoto = useCallback(() => {
        if (cameraInputRef.current) {
            cameraInputRef.current.click();
        }
    }, []);

    const handleFileInputChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(event.target.files || []);
            handleFiles(files);
            // Reset the input value so the same file can be selected again
            event.target.value = '';
        },
        [handleFiles],
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
        setIsDragOver(false);
    }, []);

    return (
        <div
            className={classNames(styles.bookEditorContainer, instanceClass)} // <-- add instance-scoped class
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
        >
            {(isUploadButtonShown ||
                isCameraButtonShown ||
                isDownloadButtonShown ||
                isAboutButtonShown ||
                isFullscreenButtonShown) && (
                <BookEditorActionbar
                    {...{
                        value,
                        isUploadButtonShown,
                        isCameraButtonShown: isCameraButtonShown ?? isTouchDevice,
                        isDownloadButtonShown,
                        isAboutButtonShown,
                        isFullscreenButtonShown,
                        onFullscreenClick,
                        onUploadDocument: handleUploadDocument,
                        onTakePhoto: handleTakePhoto,
                        isFullscreen,
                    }}
                />
            )}
            <input
                type="file"
                ref={fileUploadInputRef}
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
                multiple
            />
            <input
                type="file"
                ref={cameraInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                capture="environment"
                onChange={handleFileInputChange}
            />
            {isDragOver && <div className={styles.dropOverlay}>Drop files to upload</div>}
            <div
                style={{
                    position: 'relative',
                    flex: 1,
                    height: '100%',
                    width: '100%',
                    // outline: '1px dotted #ff3333'
                }}
            >
                {isTouchDevice && !isFocused && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 20,
                            height: '100%',
                            width: '100%',
                            backgroundColor: 'transparent',
                            // outline: '1px dotted #ff3333',
                        }}
                        onTouchStart={(event) => {
                            // [1] Record the starting position of the touch
                            const touch = event.touches[0];
                            if (touch) {
                                touchStartRef.current = { x: touch.clientX, y: touch.clientY };
                            }
                        }}
                        onTouchEnd={(event) => {
                            event.preventDefault();

                            // [1] Check if this was a tap (not a drag)
                            const touch = event.changedTouches[0];
                            if (touch && touchStartRef.current) {
                                const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
                                const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
                                const threshold = 10; // pixels

                                // [1] Only focus if the touch hasn't moved much (it's a tap)
                                if (deltaX < threshold && deltaY < threshold) {
                                    // alert('Tap inside the book editor to focus and start editing.');
                                    editor?.focus();
                                }
                            }

                            touchStartRef.current = null;
                        }}
                    />
                )}
                <Editor
                    language={BOOK_LANGUAGE_ID}
                    value={value}
                    onMount={(editor) => setEditor(editor)}
                    onChange={(newValue) => onChange?.(newValue as string_book)}
                    options={{
                        readOnly: isReadonly,
                        readOnlyMessage: {
                            value: translations?.readonlyMessage || 'You cannot edit this book',
                        },
                        wordWrap: 'on',
                        minimap: { enabled: false },
                        lineNumbers: 'off',
                        fontSize: scaledFontSize,
                        // TODO: [🚚] Allow to pass font family as prop + [😺] Make the font asset hosted on Promptbook CDN side
                        // <- TODO: [😺]Pass font as asset
                        fontFamily: `"Playfair Display", serif`,
                        // [🚚]> fontFamily: `"Bitcount Grid Single", system-ui`,
                        lineHeight: scaledLineHeight,
                        renderLineHighlight: 'none',
                        // Note: To add little lines between each line of the book, like a notebook page
                        lineDecorationsWidth: scaledContentPaddingLeft,
                        glyphMargin: false,
                        folding: false,
                        lineNumbersMinChars: 0,
                        scrollbar: {
                            vertical: 'auto',
                            horizontal: 'hidden',
                            verticalScrollbarSize: scaledScrollbarSize,
                            arrowSize: 0,
                            useShadows: false,
                        },
                    }}
                    loading={
                        <div className={styles.loading}>
                            📖{/* <- TODO: [🐱‍🚀] Better visual of loading of `<BookEditor/>` */}
                        </div>
                    }
                />
            </div>
        </div>
    );
}
