'use client';

import Editor from '@monaco-editor/react';
import { useId, useMemo, useState } from 'react';
import type { string_book } from '../../../book-2.0/agent-source/string_book';
import { classNames } from '../../_common/react-utils/classNames';
import { BookEditor } from '../../BookEditor/BookEditor';
import { downloadFile } from '../utils/downloadFile';
import { resolveCodeBlockLanguage, type MonacoCodeBlockLanguage } from './resolveCodeBlockLanguage';
import styles from './CodeBlock.module.css';

/**
 * Props for `<CodeBlock/>`.
 *
 * @private Internal utility of `<ChatMessage />` component
 */
type CodeBlockProps = {
    code: string;
    language?: string;
    className?: string;
    onCreateAgent?: (bookContent: string) => void;
};

/**
 * File extensions used when downloading code blocks.
 *
 * @private Internal utility of `<CodeBlock />` component
 */
const LANGUAGE_EXTENSIONS: Readonly<Record<MonacoCodeBlockLanguage, string>> = {
    javascript: 'js',
    typescript: 'ts',
    html: 'html',
    css: 'css',
    python: 'py',
    shell: 'sh',
    json: 'json',
    sql: 'sql',
    book: 'book',
    plaintext: 'txt',
};

/**
 * Characters that are unsafe in Monaco model paths and should be normalized.
 *
 * @private Internal utility of `<CodeBlock />` component
 */
const INVALID_MONACO_PATH_CHARACTERS_PATTERN = /[^a-zA-Z0-9_-]/g;

/**
 * Creates a per-editor Monaco model path so multiple snippets stay fully isolated.
 *
 * @param reactId - React-generated instance identifier.
 * @param language - Resolved Monaco language identifier used for file-like extension.
 * @returns Stable in-memory URI path for Monaco model creation.
 *
 * @private Internal utility of `<CodeBlock />` component
 */
function createCodeBlockMonacoModelPath(reactId: string, language: MonacoCodeBlockLanguage): string {
    const safeId = reactId.replace(INVALID_MONACO_PATH_CHARACTERS_PATTERN, '-');
    const extension = LANGUAGE_EXTENSIONS[language] || 'txt';
    return `memory://chat-code-block/${safeId}.${extension}`;
}

/**
 * Component to render a code block with syntax highlighting, copy, download, and create agent options.
 *
 * @private Internal utility of `<ChatMessage />` component
 */
export function CodeBlock({ code, language, className, onCreateAgent }: CodeBlockProps) {
    const reactId = useId();
    const normalizedLanguage = resolveCodeBlockLanguage(language);
    const isBookLanguage = normalizedLanguage === 'book';
    const lines = useMemo(() => code.split(/\r?\n/).length, [code]);
    // Note: 19px is approx line height for fontSize 14. +20 for padding.
    // We cap at 400px to avoid taking too much space, allowing scroll.
    const height = Math.min(Math.max(lines * 19, 19), 400);
    const [copied, setCopied] = useState(false);
    const modelPath = useMemo(
        () => createCodeBlockMonacoModelPath(reactId, normalizedLanguage),
        [reactId, normalizedLanguage],
    );

    /**
     * Downloads the current snippet as a plain-text file with language-aware extension.
     */
    const handleDownload = () => {
        const extension = LANGUAGE_EXTENSIONS[normalizedLanguage] || 'txt';
        const filename = `file.${extension}`;
        downloadFile(code, filename, 'text/plain');
    };

    /**
     * Copies the current snippet into the clipboard and shows transient feedback.
     */
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy code to clipboard:', error);
        }
    };

    const header = language ? (
        <div className={styles.CodeBlockHeader}>
            <span>{language}</span>
            <div className={styles.CodeBlockButtons}>
                <button onClick={handleCopy} className={styles.CopyButton} title="Copy to clipboard">
                    {copied ? 'Copied!' : 'Copy'}
                </button>
                <button onClick={handleDownload} className={styles.DownloadButton} title="Download code">
                    Download
                </button>
                {isBookLanguage && onCreateAgent && (
                    <button
                        onClick={() => onCreateAgent(code)}
                        className={styles.CreateAgentButton}
                        title="Create agent from this book"
                    >
                        Create Agent
                    </button>
                )}
            </div>
        </div>
    ) : null;

    if (isBookLanguage) {
        return (
            <div className={classNames(styles.CodeBlock, className)}>
                {header}
                <BookEditor
                    value={code as string_book}
                    isReadonly={true}
                    height={lines * 25 /* <- [🧠] A bit more than 19px to accommodate BookEditor lines */}
                />
            </div>
        );
    }

    return (
        <div className={classNames(styles.CodeBlock, className)}>
            {header}
            <Editor
                height={`${height}px`}
                language={normalizedLanguage}
                path={modelPath}
                value={code}
                theme="vs-dark"
                options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    lineNumbers: 'on',
                    folding: false,
                    glyphMargin: false,
                    fontFamily: 'Consolas, "Courier New", monospace',
                    fontSize: 14,
                    lineHeight: 19,
                    overviewRulerLanes: 0,
                    hideCursorInOverviewRuler: true,
                    renderLineHighlight: 'none',
                    contextmenu: false,
                    scrollbar: {
                        vertical: 'auto',
                        horizontal: 'auto',
                        useShadows: false,
                    },
                    domReadOnly: true,
                    wordWrap: 'off',
                }}
            />
        </div>
    );
}
