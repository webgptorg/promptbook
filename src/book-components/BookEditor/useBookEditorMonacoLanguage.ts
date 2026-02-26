import type { editor, Position } from 'monaco-editor';
import { useEffect } from 'react';
import { getAllCommitmentDefinitions } from '../../commitments/_common/getAllCommitmentDefinitions';
import { PROMPTBOOK_SYNTAX_COLORS } from '../../config';
import { BookEditorMonacoConstants } from './BookEditorMonacoConstants';
import { BookEditorMonacoTokenization } from './BookEditorMonacoTokenization';

type MonacoEditor = typeof import('monaco-editor');

type UseBookEditorMonacoLanguageProps = {
    readonly monaco: MonacoEditor | null;
};

/**
 * Registers the language helpers that power Monaco inside `BookEditorMonaco`.
 *
 * @private function of BookEditorMonaco
 */
export function useBookEditorMonacoLanguage({ monaco }: UseBookEditorMonacoLanguageProps) {
    useEffect(() => {
        if (!monaco) {
            return;
        }

        const isLanguageRegistered = monaco.languages
            .getLanguages()
            .some((language) => language.id === BookEditorMonacoConstants.BOOK_LANGUAGE_ID);

        if (!isLanguageRegistered) {
            monaco.languages.register({ id: BookEditorMonacoConstants.BOOK_LANGUAGE_ID });
        }

        const commitmentTypes = [...new Set(getAllCommitmentDefinitions().map(({ type }) => type))];
        const commitmentRegex = new RegExp(
            `^\\s*(${commitmentTypes
                .sort((a, b) => b.length - a.length)
                .map((type) => (type === 'META' ? 'META\\s+\\w+' : type.replace(/\s+/, '\\s+')))
                .join('|')})(?=\\s|$)`,
        );
        const agentReferenceCommitmentRegex = /^\s*(FROM|IMPORT|IMPORTS|TEAM)(?=\s|$)/;

        const parameterRegex = /@([a-zA-Z0-9_á-žÁ-Žč-řČ-Řš-žŠ-Žа-яА-ЯёЁ]+)/;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const defaultBodyRules: any = [
            [/^---[-]*$/, ''],
            [/^```.*$/, 'code-block', '@codeblock'],
            [agentReferenceCommitmentRegex, 'commitment', '@agent-reference-body'],
            [commitmentRegex, 'commitment'],
            [parameterRegex, 'parameter'],
            [/\{[^}]+\}/, 'parameter'],
        ];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const agentReferenceBodyRules: any = [
            [/^---[-]*$/, '', '@body'],
            [/^```.*$/, 'code-block', '@codeblock'],
            [agentReferenceCommitmentRegex, 'commitment', '@agent-reference-body'],
            [commitmentRegex, 'commitment', '@body'],
            ...BookEditorMonacoTokenization.AGENT_REFERENCE_HIGHLIGHT_REGEXES.map((regex) => [
                regex,
                'agent-reference',
            ]),
            [parameterRegex, 'parameter'],
            [/\{[^}]+\}/, 'parameter'],
        ];

        const tokenProvider = monaco.languages.setMonarchTokensProvider(BookEditorMonacoConstants.BOOK_LANGUAGE_ID, {
            ignoreCase: true,
            tokenizer: {
                root: [
                    [/^\s*$/, 'empty'],
                    [/^-*$/, 'line'],
                    [/^```.*$/, 'code-block', '@codeblock'],
                    [/^.*$/, 'title', '@body'],
                ],
                body: defaultBodyRules,
                'agent-reference-body': agentReferenceBodyRules,
                codeblock: [
                    [/^```.*$/, 'code-block', '@pop'],
                    [/^.*$/, 'code-block'],
                ],
            },
        });

        const completionProvider = monaco.languages.registerCompletionItemProvider(
            BookEditorMonacoConstants.BOOK_LANGUAGE_ID,
            {
                provideCompletionItems: (model: editor.ITextModel, position: Position) => {
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
                        range,
                    }));

                    return { suggestions };
                },
            },
        );

        const linkProvider = monaco.languages.registerLinkProvider(BookEditorMonacoConstants.BOOK_LANGUAGE_ID, {
            provideLinks: (model: editor.ITextModel) => {
                const content = model.getValue();
                const links = BookEditorMonacoTokenization.extractAgentReferenceMatches(content).map((reference) => {
                    const startPos = model.getPositionAt(reference.index);
                    const endPos = model.getPositionAt(reference.index + reference.length);

                    return {
                        range: new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
                        url: reference.url,
                        tooltip: `Open agent: ${reference.value}`,
                    };
                });

                return { links };
            },
        });

        monaco.editor.defineTheme('book-theme', {
            base: 'vs',
            inherit: true,
            rules: [
                {
                    token: 'title',
                    foreground: PROMPTBOOK_SYNTAX_COLORS.TITLE.toHex(),
                    fontStyle: 'bold underline',
                },
                {
                    token: 'commitment',
                    foreground: PROMPTBOOK_SYNTAX_COLORS.COMMITMENT.toHex(),
                    fontStyle: 'bold',
                },
                {
                    token: 'parameter',
                    foreground: PROMPTBOOK_SYNTAX_COLORS.PARAMETER.toHex(),
                    fontStyle: 'italic',
                },
                {
                    token: 'agent-reference',
                    foreground: PROMPTBOOK_SYNTAX_COLORS.COMMITMENT.toHex(),
                    fontStyle: 'underline',
                },
                {
                    token: 'code-block',
                    foreground: PROMPTBOOK_SYNTAX_COLORS.CODE_BLOCK.toHex(),
                },
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
            linkProvider.dispose();
        };
    }, [monaco]);
}
