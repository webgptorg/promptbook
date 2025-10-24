'use client';

import Editor, { useMonaco } from '@monaco-editor/react';
import { useCallback, useEffect, useState } from 'react';
import { getAllCommitmentDefinitions } from '../../book-2.0/commitments';
import type { BookEditorProps } from './BookEditor';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import styles from './BookEditor.module.css';
import { classNames } from '../_common/react-utils/classNames';

const BOOK_LANGUAGE_ID = 'book';

export function BookEditorMonaco(props: BookEditorProps) {
    const { value, onChange, isReadonly, onFileUpload, fontClassName } = props;
    const [isDragOver, setIsDragOver] = useState(false);

    const monaco = useMonaco();

    useEffect(() => {
        if (!monaco) {
            return;
        }

        // Register a new language
        monaco.languages.register({ id: BOOK_LANGUAGE_ID });

        const commitmentTypes = getAllCommitmentDefinitions().map(({ type }) => type);
        const keywordRegex = new RegExp(`^(${commitmentTypes.join('|')})(\\s.*)?$`);

        // Register a tokens provider for the language
        monaco.languages.setMonarchTokensProvider(BOOK_LANGUAGE_ID, {
            tokenizer: {
                root: [
                    [/@\w+/, 'parameter'],
                    [/\{[^}]+\}/, 'parameter'],
                    [keywordRegex, 'keyword'],
                ],
            },
        });

        monaco.editor.defineTheme('book-theme', {
            base: 'vs',
            inherit: true,
            rules: [
                { token: 'parameter', foreground: '800080' }, // Purple for parameters
                { token: 'keyword', foreground: '0000ff' }, // Blue for keywords
            ],
            colors: {},
        });

        monaco.editor.setTheme('book-theme');
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
            className={classNames(styles.bookEditorContainer, fontClassName)}
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
                onMount={(editor) => {
                    if (!monaco) {
                        return;
                    }
                    const model = editor.getModel();
                    if (!model) {
                        return;
                    }

                    const firstLine = model.getLineContent(1);
                    editor.deltaDecorations(
                        [],
                        [
                            {
                                range: new monaco.Range(1, 1, 1, firstLine.length + 1),
                                options: {
                                    inlineClassName: 'book-title',
                                },
                            },
                        ],
                    );
                }}
                options={{
                    readOnly: isReadonly,
                    wordWrap: 'on',
                    minimap: { enabled: false },
                }}
            />
        </div>
    );
}
