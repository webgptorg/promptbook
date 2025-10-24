import Editor, { useMonaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import React, { useCallback, useRef, useState } from 'react';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { DEFAULT_BOOK, validateBook } from '../../book-2.0/agent-source/string_book';
import { DEFAULT_BOOK_TITLE } from '../../config';
import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../../version';
import { classNames } from '../_common/react-utils/classNames';
import { CloseIcon } from '../icons/CloseIcon';
import type { BookEditorProps } from './BookEditor';
import styles from './BookEditor.module.css';
import { bookLanguageDefinition } from './bookLanguageDefinition';
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
        isReadonly = false,
        onClose,
    } = props;
    const [internalValue, setInternalValue] = useState<string_book>(DEFAULT_BOOK);
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    const value = controlledValue !== undefined ? controlledValue : internalValue;
    const effectiveFontClassName = fontClassName || DEFAULT_BOOK_FONT_CLASS;

    const monaco = useMonaco();

    React.useEffect(() => {
        if (monaco) {
            monaco.languages.register({ id: 'book' });
            monaco.languages.setMonarchTokensProvider('book', bookLanguageDefinition);
        }
    }, [monaco]);

    const handleChange = useCallback(
        (newValue: string | undefined) => {
            if (controlledValue !== undefined) {
                onChange?.(validateBook(newValue || ''));
            } else {
                setInternalValue(validateBook(newValue || ''));
            }
        },
        [controlledValue, onChange],
    );

    const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
        editorRef.current = editor;
    };

    const [isDragOver, setIsDragOver] = useState<boolean>(false);

    const handleDrop = useCallback(
        async (event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            setIsDragOver(false);

            if (!onFileUpload || !editorRef.current) return;

            const files = Array.from(event.dataTransfer.files);
            if (files.length === 0) return;

            try {
                const uploadPromises = files.map((file) => onFileUpload(file));
                const uploadResults = await Promise.all(uploadPromises);

                const target = editorRef.current.getTargetAtClientPoint(event.clientX, event.clientY);
                if (target?.position) {
                    const position = target.position;
                    const textToInsert = uploadResults.join('\n');
                    editorRef.current.executeEdits('dnd', [
                        {
                            range: {
                                startLineNumber: position.lineNumber,
                                startColumn: position.column,
                                endLineNumber: position.lineNumber,
                                endColumn: position.column,
                            },
                            text: textToInsert,
                        },
                    ]);
                }
            } catch (error) {
                console.error('File upload failed:', error);
            }
        },
        [onFileUpload],
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
            className={classNames(
                styles.bookEditorContainer,
                isVerbose && styles.isVerbose,
                isReadonly && styles.isReadonly,
                className,
            )}
        >
            <button className={styles.closeButton} onClick={onClose}>
                <CloseIcon />
            </button>
            <div
                className={classNames(
                    styles.bookEditorWrapper,
                    effectiveFontClassName,
                    isBorderRadiusDisabled && styles.isBorderRadiusDisabled,
                    isDragOver && styles.isDragOver,
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
            >
                <div aria-hidden className={styles.bookEditorBackground} style={{ backgroundImage: 'none' }} />
                <Editor
                    language="book"
                    value={value}
                    onChange={handleChange}
                    onMount={handleEditorDidMount}
                    options={{
                        readOnly: isReadonly,
                        wordWrap: 'on',
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                    }}
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
