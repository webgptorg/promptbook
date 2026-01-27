'use client';

import Editor from '@monaco-editor/react';
import { useMemo, useState } from 'react';
import type { string_book } from '../../../book-2.0/agent-source/string_book';
import { classNames } from '../../_common/react-utils/classNames';
import { BookEditor } from '../../BookEditor/BookEditor';
import { downloadFile } from '../utils/downloadFile';
import styles from './CodeBlock.module.css';

type CodeBlockProps = {
    code: string;
    language?: string;
    className?: string;
    onCreateAgent?: (bookContent: string) => void;
};

const LANGUAGE_EXTENSIONS: Record<string, string> = {
    python: 'py',
    javascript: 'js',
    typescript: 'ts',
    json: 'json',
    html: 'html',
    css: 'css',
    markdown: 'md',
    text: 'txt',
    xml: 'xml',
    sql: 'sql',
    sh: 'sh',
    bash: 'sh',
    zsh: 'sh',
    yaml: 'yaml',
    yml: 'yaml',
    book: 'book',
};

/**
 * Component to render a code block with syntax highlighting, copy, download, and create agent options.
 *
 * @private Internal utility of `<ChatMessage />` component
 */
export function CodeBlock({ code, language, className, onCreateAgent }: CodeBlockProps) {
    const lines = useMemo(() => code.split(/\r?\n/).length, [code]);
    // Note: 19px is approx line height for fontSize 14. +20 for padding.
    // We cap at 400px to avoid taking too much space, allowing scroll.
    const height = Math.min(Math.max(lines * 19, 19), 400);
    const [copied, setCopied] = useState(false);

    const handleDownload = () => {
        const lang = language?.trim().toLowerCase() || 'text';
        const extension = LANGUAGE_EXTENSIONS[lang] || lang;
        const filename = `file.${extension}`;
        downloadFile(code, filename, 'text/plain');
    };

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
                {language?.trim().toLowerCase() === 'book' && onCreateAgent && (
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

    if (language?.trim().toLowerCase() === 'book') {
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
                language={language || 'plaintext'}
                value={code}
                theme="vs-dark"
                options={{
                    readOnly: true,
                    minimap: { enabled: false },
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
