'use client';

import Editor from '@monaco-editor/react';
import { useMemo } from 'react';
import { classNames } from '../../_common/react-utils/classNames';
import styles from './CodeBlock.module.css';

type CodeBlockProps = {
    code: string;
    language?: string;
    className?: string;
};

export function CodeBlock({ code, language, className }: CodeBlockProps) {
    const lines = useMemo(() => code.split('\n').length, [code]);
    // Note: 19px is approx line height for fontSize 14. +20 for padding.
    // We cap at 400px to avoid taking too much space, allowing scroll.
    const height = Math.min(Math.max(lines * 19, 19), 400); 

    return (
        <div className={classNames(styles.CodeBlock, className)}>
            {language && (
                <div className={styles.CodeBlockHeader}>
                    <span>{language}</span>
                </div>
            )}
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
