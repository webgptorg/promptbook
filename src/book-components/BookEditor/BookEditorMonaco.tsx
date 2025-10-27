'use client';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import Editor, { useMonaco } from '@monaco-editor/react';
import { useCallback, useEffect, useState } from 'react';
// [🚱]> import { MonacoBinding } from 'y-monaco';
// [🚱]> import { WebsocketProvider } from 'y-websocket';
// [🚱]> import * as Y from 'yjs';
// [🚱]> import { TODO_any } from '../../_packages/types.index';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { getAllCommitmentDefinitions } from '../../book-2.0/commitments';
import { PROMPTBOOK_SYNTAX_COLORS } from '../../config';
import { classNames } from '../_common/react-utils/classNames';
import type { BookEditorProps } from './BookEditor';
import styles from './BookEditor.module.css';
import { BookEditorActionbar } from './BookEditorActionbar';

const BOOK_LANGUAGE_ID = 'book';
const LINE_HEIGHT = 28;
const CONTENT_PADDING_LEFT = 60;
const VERTICAL_LINE_LEFT = 40;

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
        isDownloadButtonShown,
        isAboutButtonShown = true,
        // [🚱]> sync,
    } = props;
    const [isDragOver, setIsDragOver] = useState(false);

    const monaco = useMonaco();

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
        if (!monaco) {
            return;
        }

        // Register a new language
        monaco.languages.register({ id: BOOK_LANGUAGE_ID });

        const commitmentTypes = [...new Set(getAllCommitmentDefinitions().map(({ type }) => type))];
        const commitmentRegex = new RegExp(
            `^(${commitmentTypes.map((type) => (type === 'META' ? 'META\\s+\\w+' : type)).join('|')})\\s`,
        );

        // Note: Using a broad character set for Latin and Cyrillic to support international characters in parameters.
        //       Monarch tokenizer does not support Unicode property escapes like \p{L}.
        const parameterRegex = /@([a-zA-Z0-9_á-žÁ-Žč-řČ-Řš-žŠ-Žа-яА-ЯёЁ]+)/;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bookRules: any = [
            [parameterRegex, 'parameter'],
            [/\{[^}]+\}/, 'parameter'],
            [commitmentRegex, 'commitment'],
        ];

        // Register a tokens provider for the language
        const tokenProvider = monaco.languages.setMonarchTokensProvider(BOOK_LANGUAGE_ID, {
            ignoreCase: true,
            tokenizer: {
                root: [[/^.*$/, 'title', '@body']],
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
                    fontStyle: 'underline italic' /* 'bold underline' */,
                },
                { token: 'commitment', foreground: PROMPTBOOK_SYNTAX_COLORS.COMMITMENT.toHex() },
                { token: 'parameter', foreground: PROMPTBOOK_SYNTAX_COLORS.PARAMETER.toHex(), fontStyle: `italic` },
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
        const styleId = 'notebook-margin-line-style';

        let style = document.getElementById(styleId) as HTMLStyleElement | null;
        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            document.head.appendChild(style);
        }

        style.innerHTML = `
            .monaco-editor .view-lines {
                background-image: linear-gradient(to bottom, transparent ${
                    LINE_HEIGHT - 1
                }px, ${PROMPTBOOK_SYNTAX_COLORS.LINE.toHex()} ${LINE_HEIGHT - 1}px);
                background-size: 100% ${LINE_HEIGHT}px;
            }
            .monaco-editor .overflow-guard::before {
                content: '';
                position: absolute;
                left: ${VERTICAL_LINE_LEFT}px;
                top: 0;
                bottom: 0;
                width: 1px;
                background-color: ${PROMPTBOOK_SYNTAX_COLORS.LINE.toHex()};
                z-index: 10;
            }
        `;

        return () => {
            // Note: Style is not removed on purpose to avoid flickering during development with fast refresh
        };
    }, []);

    const handleDrop = useCallback(
        async (event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            setIsDragOver(false);

            if (!onFileUpload) return;

            const files = Array.from(event.dataTransfer.files);
            if (files.length === 0) return;

            try {
                const uploadPromises = files.map((file) => onFileUpload(file));
                const uploadResults = await Promise.all(uploadPromises);

                // Note: This is a simplified implementation. A more robust solution would
                // determine the drop position in the editor and insert the text there.
                const newText = uploadResults.join('\n');
                const currentValue = value || '';
                const newValue = currentValue + '\n' + newText;
                onChange?.(newValue as string_book);
            } catch (error) {
                console.error('File upload failed:', error);
            }
        },
        [onFileUpload, value, onChange],
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
            className={classNames(styles.bookEditorContainer)}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
        >
            {(isDownloadButtonShown || isAboutButtonShown) && (
                <BookEditorActionbar {...{ value, isDownloadButtonShown, isAboutButtonShown }} />
            )}
            {isDragOver && <div className={styles.dropOverlay}>Drop files to upload</div>}
            <Editor
                language={BOOK_LANGUAGE_ID}
                value={value}
                // [🚱]> onMount={(editor) => setEditor(editor)}
                onChange={(newValue) => onChange?.(newValue as string_book)}
                options={{
                    readOnly: isReadonly,
                    readOnlyMessage: {
                        value: translations?.readonlyMessage || 'You cannot edit this book',
                    },
                    wordWrap: 'on',
                    minimap: { enabled: false },
                    lineNumbers: 'off',
                    fontSize: 20,
                    fontFamily: `ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif`,
                    lineHeight: LINE_HEIGHT,
                    renderLineHighlight: 'none',
                    // Note: To add little lines between each line of the book, like a notebook page
                    lineDecorationsWidth: CONTENT_PADDING_LEFT,
                    glyphMargin: false,
                    folding: false,
                    lineNumbersMinChars: 0,
                    scrollbar: {
                        vertical: 'auto',
                        horizontal: 'hidden',
                        verticalScrollbarSize: 5,
                        arrowSize: 0,
                        useShadows: false,
                    },
                }}
                loading={<div className={styles.loading}>📖</div>}
            />
        </div>
    );
}
