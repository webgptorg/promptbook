import { useEffect, useRef } from 'react';
import type { editor, Monaco } from 'monaco-editor';

type UseBookEditorMonacoDecorationsProps = {
    readonly editor: editor.IStandaloneCodeEditor | null;
    readonly monaco: Monaco | null;
};

/**
 * Adds visual decorations for separators and code blocks inside `BookEditorMonaco`.
 *
 * @private function of BookEditorMonaco
 */
export function useBookEditorMonacoDecorations({ editor, monaco }: UseBookEditorMonacoDecorationsProps) {
    const decorationIdsRef = useRef<string[]>([]);
    const codeBlockDecorationIdsRef = useRef<string[]>([]);

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

            const lines = text.split(/\r?\n/);
            const codeBlockDecorations: editor.IModelDeltaDecoration[] = [];
            let inCodeBlock = false;
            let codeBlockStartLine = 0;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line?.trim().startsWith('```')) {
                    if (!inCodeBlock) {
                        inCodeBlock = true;
                        codeBlockStartLine = i + 1;
                    } else {
                        inCodeBlock = false;
                        const endLine = i + 1;

                        for (let j = codeBlockStartLine; j <= endLine; j++) {
                            const isFirst = j === codeBlockStartLine;
                            const isLast = j === endLine;

                            codeBlockDecorations.push({
                                range: new monaco.Range(j, 1, j, 1),
                                options: {
                                    isWholeLine: true,
                                    className: `code-block-box${isFirst ? ' code-block-top' : ''}${
                                        isLast ? ' code-block-bottom' : ''
                                    }`,
                                },
                            });
                        }
                    }
                }
            }

            codeBlockDecorationIdsRef.current = editor.deltaDecorations(
                codeBlockDecorationIdsRef.current,
                codeBlockDecorations,
            );
        };

        updateDecorations();

        const changeListener = editor.onDidChangeModelContent(() => {
            updateDecorations();
        });

        return () => {
            changeListener.dispose();
        };
    }, [editor, monaco]);
}
