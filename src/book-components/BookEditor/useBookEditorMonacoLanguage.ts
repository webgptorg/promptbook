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
 * Theme identifier shared by all BookEditor Monaco instances.
 *
 * @private function of BookEditorMonaco
 */
const BOOK_EDITOR_THEME_ID = 'book-theme';

/**
 * Internal Monaco flag used to prevent duplicate global language registrations.
 *
 * @private function of BookEditorMonaco
 */
const BOOK_EDITOR_LANGUAGE_INITIALIZED_FLAG = 'promptbookBookEditorLanguageInitialized';

/**
 * Monaco instance shape extended with the BookEditor setup marker.
 *
 * @private function of BookEditorMonaco
 */
type MonacoEditorWithBookEditorLanguageState = MonacoEditor & {
    [BOOK_EDITOR_LANGUAGE_INITIALIZED_FLAG]?: boolean;
};

/**
 * Ensures the BookEditor Monaco language, tokenizer, links and completion providers are
 * registered exactly once per Monaco instance, while always re-applying the Book theme.
 *
 * @private function of BookEditorMonaco
 */
export function ensureBookEditorMonacoLanguage(monaco: MonacoEditor): void {
    const monacoWithLanguageState = monaco as MonacoEditorWithBookEditorLanguageState;
    if (monacoWithLanguageState[BOOK_EDITOR_LANGUAGE_INITIALIZED_FLAG]) {
        monaco.editor.setTheme(BOOK_EDITOR_THEME_ID);
        return;
    }

    monacoWithLanguageState[BOOK_EDITOR_LANGUAGE_INITIALIZED_FLAG] = true;

    monaco.languages.register({ id: BookEditorMonacoConstants.BOOK_LANGUAGE_ID });

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

    monaco.languages.setMonarchTokensProvider(BookEditorMonacoConstants.BOOK_LANGUAGE_ID, {
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

    monaco.languages.registerCompletionItemProvider(BookEditorMonacoConstants.BOOK_LANGUAGE_ID, {
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
    });

    monaco.languages.registerLinkProvider(BookEditorMonacoConstants.BOOK_LANGUAGE_ID, {
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

    monaco.editor.defineTheme(BOOK_EDITOR_THEME_ID, {
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

    monaco.editor.setTheme(BOOK_EDITOR_THEME_ID);
}

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

        ensureBookEditorMonacoLanguage(monaco);
    }, [monaco]);
}
