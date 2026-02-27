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
    codeBlockId?: string;
    className?: string;
    onCreateAgent?: (bookContent: string) => void;
};

/**
 * Maps markdown fence language aliases to Monaco language identifiers.
 *
 * @private Internal utility of `<CodeBlock/>` component
 */
const MONACO_LANGUAGE_ALIASES: Record<string, string> = {
    js: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    ts: 'typescript',
    jsx: 'javascript',
    tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    md: 'markdown',
    yml: 'yaml',
    shell: 'shell',
    shellscript: 'shell',
    bash: 'shell',
    zsh: 'shell',
    sh: 'shell',
    txt: 'plaintext',
    text: 'plaintext',
    plain: 'plaintext',
    csharp: 'csharp',
    'c#': 'csharp',
    cs: 'csharp',
    'c++': 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
};

/**
 * Maps markdown fence language aliases to download file extensions.
 *
 * @private Internal utility of `<CodeBlock/>` component
 */
const LANGUAGE_EXTENSIONS: Record<string, string> = {
    python: 'py',
    javascript: 'js',
    typescript: 'ts',
    tsx: 'tsx',
    jsx: 'jsx',
    json: 'json',
    html: 'html',
    css: 'css',
    markdown: 'md',
    plaintext: 'txt',
    text: 'txt',
    xml: 'xml',
    sql: 'sql',
    shell: 'sh',
    sh: 'sh',
    bash: 'sh',
    zsh: 'sh',
    yaml: 'yaml',
    yml: 'yaml',
    book: 'book',
};

/**
 * Sanitizes one value to be safe for Monaco in-memory model paths.
 *
 * @param value - Arbitrary value to normalize.
 * @returns Path-safe identifier segment.
 *
 * @private Internal utility of `<CodeBlock/>` component
 */
function toPathSafeSegment(value: string): string {
    const sanitized = value.replace(/[^a-z0-9._-]+/gi, '_').replace(/^_+|_+$/g, '');
    return sanitized || 'snippet';
}

/**
 * Resolves one markdown language token to a Monaco language identifier.
 *
 * @param language - Language extracted from markdown.
 * @returns Monaco language identifier.
 *
 * @private Internal utility of `<CodeBlock/>` component
 */
function resolveMonacoLanguage(language: string | undefined): string {
    const normalizedLanguage = language?.trim().toLowerCase() || '';
    if (!normalizedLanguage) {
        return 'plaintext';
    }

    return MONACO_LANGUAGE_ALIASES[normalizedLanguage] || normalizedLanguage;
}

/**
 * Component to render a code block with syntax highlighting, copy, download, and create agent options.
 *
 * @private Internal utility of `<ChatMessage />` component
 */
export function CodeBlock({ code, language, codeBlockId, className, onCreateAgent }: CodeBlockProps) {
    const lines = useMemo(() => code.split(/\r?\n/).length, [code]);
    const normalizedLanguage = useMemo(() => language?.trim().toLowerCase(), [language]);
    const monacoLanguage = useMemo(() => resolveMonacoLanguage(language), [language]);
    const monacoPath = useMemo(() => {
        const languageSegment = toPathSafeSegment(monacoLanguage);
        const blockSegment = toPathSafeSegment(codeBlockId || 'code-block');
        return `file:///promptbook/${languageSegment}/${blockSegment}`;
    }, [codeBlockId, monacoLanguage]);
    // Note: 19px is approx line height for fontSize 14. +20 for padding.
    // We cap at 400px to avoid taking too much space, allowing scroll.
    const height = Math.min(Math.max(lines * 19, 19), 400);
    const [copied, setCopied] = useState(false);

    const handleDownload = () => {
        const lang = normalizedLanguage || 'text';
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
                {normalizedLanguage === 'book' && onCreateAgent && (
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

    if (normalizedLanguage === 'book') {
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
                language={monacoLanguage}
                path={monacoPath}
                value={code}
                theme="vs-dark"
                keepCurrentModel={false}
                options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineNumbers: 'on',
                    automaticLayout: true,
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
