'use client';

import Editor, { useMonaco } from '@monaco-editor/react';
import { useCallback, useEffect, useState } from 'react';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { getAllCommitmentDefinitions } from '../../book-2.0/commitments';
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

        const commitmentTypes = getAllCommitmentDefinitions().map(({ type }) => type);
        const keywordRegex = new RegExp(`^(${commitmentTypes.join('|')})`);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bookRules: any = [
            [/@\w+/, 'parameter'],
            [/\{[^}]+\}/, 'parameter'],
            [keywordRegex, 'keyword'],
        ];

        // Register a tokens provider for the language
        monaco.languages.setMonarchTokensProvider(BOOK_LANGUAGE_ID, {
            ignoreCase: true,
            tokenizer: {
                root: [[/^.*$/, 'title', '@body']],
                body: bookRules,
            },
        });

        monaco.editor.defineTheme('book-theme', {
            base: 'vs',
            inherit: true,
            rules: [
                { token: 'title', foreground: 'DA0F78', fontStyle: 'bold italic' },
                { token: 'keyword', foreground: 'DA0F78' },
                { token: 'parameter', foreground: '8e44ad', fontStyle: `italic` },
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
                }}
                loading={<div className={styles.loading}>📖</div>}
            />
        </div>
    );
}
