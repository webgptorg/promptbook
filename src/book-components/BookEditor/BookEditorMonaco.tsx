'use client';

import Editor, { useMonaco } from '@monaco-editor/react';
import { useCallback, useEffect, useState } from 'react';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { getAllCommitmentDefinitions } from '../../book-2.0/commitments';
import { PROMPTBOOK_SYNTAX_COLORS } from '../../config';
import { classNames } from '../_common/react-utils/classNames';
import type { BookEditorProps } from './BookEditor';
import styles from './BookEditor.module.css';

const BOOK_LANGUAGE_ID = 'book';

/**
 * @private Internal component used by `BookEditor`
 */
export function BookEditorMonaco(props: BookEditorProps) {
    const { value, onChange, isReadonly, onFileUpload } = props;
    const [isDragOver, setIsDragOver] = useState(false);

    const monaco = useMonaco();

    useEffect(() => {
        if (!monaco) {
            return;
        }

        // Register a new language
        monaco.languages.register({ id: BOOK_LANGUAGE_ID });

        const commitmentTypes = [...new Set(getAllCommitmentDefinitions().map(({ type }) => type))];
        const commitmentRegex = new RegExp(
            `^(${commitmentTypes
                .map((type) => (type === 'META' ? 'META\\s+\\w+' : type))
                .join('|')})\\s`,
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bookRules: any = [
            [/@\w+/, 'parameter'],
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
                { token: 'title', foreground: PROMPTBOOK_SYNTAX_COLORS.TITLE.toHex(), fontStyle: 'bold underline' },
                { token: 'commitment', foreground: PROMPTBOOK_SYNTAX_COLORS.COMMITMENT.toHex() },
                { token: 'parameter', foreground: PROMPTBOOK_SYNTAX_COLORS.PARAMETER.toHex(), fontStyle: `italic` },
            ],
            colors: {},
        });

        monaco.editor.setTheme('book-theme');

        return () => {
            tokenProvider.dispose();
            completionProvider.dispose();
        };
    }, [monaco]);

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
            {isDragOver && <div className={styles.dropOverlay}>Drop files to upload</div>}
            <Editor
                language={BOOK_LANGUAGE_ID}
                value={value}
                onChange={(newValue) => onChange?.(newValue as string_book)}
                options={{
                    readOnly: isReadonly,
                    wordWrap: 'on',
                    minimap: { enabled: false },
                    lineNumbers: 'off',
                    fontSize: 20,
                    fontFamily: `ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif`,
                    lineHeight: 28,
                    renderLineHighlight: 'none',
                    // Note: To add little lines between each line of the book, like a notebook page
                    glyphMargin: false,
                    folding: false,
                    lineDecorationsWidth: 0,
                    lineNumbersMinChars: 0,
                }}
                loading={<div className={styles.loading}>📖</div>}
            />
        </div>
    );
}
