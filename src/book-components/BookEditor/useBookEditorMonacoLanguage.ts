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
 * Commitment type treated as high-visibility TODO annotation.
 *
 * @private function of BookEditorMonaco
 */
const TODO_COMMITMENT_TYPES = ['TODO'] as const;

/**
 * Commitment types treated as low-visibility notes/comments.
 *
 * @private function of BookEditorMonaco
 */
const NOTE_COMMITMENT_TYPES = ['NOTE', 'NOTES', 'NONCE'] as const;

/**
 * Monaco tokenizer rule tuple.
 *
 * @private function of BookEditorMonaco
 */
type MonacoTokenizerRule = readonly [RegExp, string, string?];

/**
 * Note-like commitment state descriptor.
 *
 * @private function of BookEditorMonaco
 */
type NoteLikeCommitmentState = {
    readonly regex: RegExp;
    readonly token: 'note-commitment' | 'todo-commitment';
    readonly state: '@note-commitment-body' | '@todo-commitment-body';
};

/**
 * Config describing how note-like commitments map to Monaco tokens and states.
 *
 * @private function of BookEditorMonaco
 */
const NOTE_LIKE_COMMITMENT_GROUPS = [
    {
        token: 'todo-commitment',
        state: '@todo-commitment-body',
        commitmentTypes: TODO_COMMITMENT_TYPES,
    },
    {
        token: 'note-commitment',
        state: '@note-commitment-body',
        commitmentTypes: NOTE_COMMITMENT_TYPES,
    },
] as const satisfies ReadonlyArray<{
    readonly token: NoteLikeCommitmentState['token'];
    readonly state: NoteLikeCommitmentState['state'];
    readonly commitmentTypes: ReadonlyArray<string>;
}>;

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
 * Builds a regex that matches one commitment keyword at line start.
 *
 * @param commitmentTypes - Commitment keyword list to include.
 * @returns Compiled regex for Monaco tokenizer rules.
 * @private function of BookEditorMonaco
 */
function createCommitmentRegex(commitmentTypes: ReadonlyArray<string>): RegExp {
    if (commitmentTypes.length === 0) {
        return /a^/;
    }

    const commitmentPatterns = [...commitmentTypes]
        .sort((a: string, b: string) => b.length - a.length)
        .map((type: string) => (type === 'META' ? 'META\\s+\\w+' : type.replace(/\s+/, '\\s+')))
        .join('|');

    return new RegExp(`^\\s*(${commitmentPatterns})(?=\\s|$)`);
}

/**
 * Creates regex-token-state triples for note-like commitment groups available in this runtime.
 *
 * @param commitmentTypes - All known commitment types.
 * @returns Tokenization metadata for TODO/NOTE-like commitment groups.
 * @private function of BookEditorMonaco
 */
function createNoteLikeCommitmentStates(commitmentTypes: ReadonlyArray<string>): Array<NoteLikeCommitmentState> {
    const commitmentTypeSet = new Set(commitmentTypes.map((type) => type.toUpperCase()));

    return NOTE_LIKE_COMMITMENT_GROUPS.flatMap((group) => {
        const matchingCommitmentTypes = group.commitmentTypes.filter((type) =>
            commitmentTypeSet.has(type.toUpperCase()),
        );
        if (matchingCommitmentTypes.length === 0) {
            return [];
        }

        return [
            {
                regex: createCommitmentRegex(matchingCommitmentTypes),
                token: group.token,
                state: group.state,
            } satisfies NoteLikeCommitmentState,
        ];
    });
}

/**
 * Builds tokenizer rules that switch between commitment-level Monaco states.
 *
 * @param noteLikeStates - Rules for TODO/NOTE-style commitments.
 * @param agentReferenceCommitmentRegex - Regex for commitments supporting compact references.
 * @param commitmentRegex - Regex for standard executable commitments.
 * @returns Shared transition rules reused by body-like tokenizer states.
 * @private function of BookEditorMonaco
 */
function createCommitmentTransitionRules(
    noteLikeStates: ReadonlyArray<NoteLikeCommitmentState>,
    agentReferenceCommitmentRegex: RegExp,
    commitmentRegex: RegExp,
): Array<MonacoTokenizerRule> {
    return [
        ...noteLikeStates.map(({ regex, token, state }) => [regex, token, state] as const),
        [agentReferenceCommitmentRegex, 'commitment', '@agent-reference-body'],
        [commitmentRegex, 'commitment', '@body'],
    ];
}

/**
 * Builds a tokenizer state that paints every remaining line in one note-like token until a new commitment starts.
 *
 * @param token - Token emitted for plain lines in this note-like state.
 * @param commitmentTransitionRules - Shared transitions to other commitment states.
 * @returns Monaco tokenizer rules for one note-like body state.
 * @private function of BookEditorMonaco
 */
function createNoteLikeBodyRules(
    token: NoteLikeCommitmentState['token'],
    commitmentTransitionRules: ReadonlyArray<MonacoTokenizerRule>,
): Array<MonacoTokenizerRule> {
    return [...commitmentTransitionRules, [/^\s*$/, token], [/.+$/, token]];
}

/**
 * Ensures the BookEditor Monaco language, tokenizer, links and completion providers are
 * registered exactly once per Monaco instance, while always re-applying the Book theme.
 *
 * @private function of BookEditorMonaco
 */
export function ensureBookEditorMonacoLanguage(monaco: MonacoEditor): void {
    const monacoWithLanguageState = monaco as MonacoEditorWithBookEditorLanguageState;
    if (monacoWithLanguageState[BOOK_EDITOR_LANGUAGE_INITIALIZED_FLAG]) {
        monaco.editor.setTheme(BookEditorMonacoConstants.BOOK_THEME_ID);
        return;
    }

    monacoWithLanguageState[BOOK_EDITOR_LANGUAGE_INITIALIZED_FLAG] = true;

    monaco.languages.register({ id: BookEditorMonacoConstants.BOOK_LANGUAGE_ID });

    const commitmentTypes = [...new Set(getAllCommitmentDefinitions().map(({ type }) => type))];
    const noteLikeCommitmentTypeSet = new Set<string>([...TODO_COMMITMENT_TYPES, ...NOTE_COMMITMENT_TYPES]);
    const noteLikeCommitmentStates = createNoteLikeCommitmentStates(commitmentTypes);
    const executableCommitmentTypes = commitmentTypes.filter(
        (type) => !noteLikeCommitmentTypeSet.has(type.toUpperCase()),
    );
    const commitmentRegex = createCommitmentRegex(executableCommitmentTypes);
    const agentReferenceCommitmentRegex = /^\s*(FROM|IMPORT|IMPORTS|TEAM)(?=\s|$)/;
    const commitmentTransitionRules = createCommitmentTransitionRules(
        noteLikeCommitmentStates,
        agentReferenceCommitmentRegex,
        commitmentRegex,
    );

    const parameterRegex = /@([a-zA-Z0-9_á-žÁ-Žč-řČ-Řš-žŠ-Žа-яА-ЯёЁ]+)/;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const defaultBodyRules: any = [
        [/^---[-]*$/, ''],
        [/^```.*$/, 'code-block', '@codeblock'],
        ...commitmentTransitionRules,
        [parameterRegex, 'parameter'],
        [/\{[^}]+\}/, 'parameter'],
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agentReferenceBodyRules: any = [
        [/^---[-]*$/, '', '@body'],
        [/^```.*$/, 'code-block', '@codeblock'],
        ...commitmentTransitionRules,
        ...BookEditorMonacoTokenization.AGENT_REFERENCE_HIGHLIGHT_REGEXES.map((regex) => [regex, 'agent-reference']),
        [parameterRegex, 'parameter'],
        [/\{[^}]+\}/, 'parameter'],
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const noteCommitmentBodyRules: any = createNoteLikeBodyRules('note-commitment', commitmentTransitionRules);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const todoCommitmentBodyRules: any = createNoteLikeBodyRules('todo-commitment', commitmentTransitionRules);

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
            'note-commitment-body': noteCommitmentBodyRules,
            'todo-commitment-body': todoCommitmentBodyRules,
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

    monaco.editor.defineTheme(BookEditorMonacoConstants.BOOK_THEME_ID, {
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
                token: 'note-commitment',
                foreground: PROMPTBOOK_SYNTAX_COLORS.NOTE_COMMITMENT.toHex(),
            },
            {
                token: 'todo-commitment',
                foreground: PROMPTBOOK_SYNTAX_COLORS.TODO_COMMITMENT_TEXT.toHex(),
                background: PROMPTBOOK_SYNTAX_COLORS.TODO_COMMITMENT_BACKGROUND.toHex(),
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

    monaco.editor.setTheme(BookEditorMonacoConstants.BOOK_THEME_ID);
}

/**
 * Props required to enforce Book Monaco language/theme on one mounted editor.
 *
 * @private function of BookEditorMonaco
 */
type EnsureBookEditorMonacoLanguageForEditorProps = {
    readonly monaco: MonacoEditor;
    readonly monacoEditor: editor.IStandaloneCodeEditor;
};

/**
 * Ensures the mounted Monaco editor model uses Book language and Book theme.
 *
 * This is resilient when a shared Monaco runtime/theme is changed by another page and the
 * Book editor tree is restored from App Router cache without a full remount.
 *
 * @param props - Monaco runtime and mounted editor instance.
 * @private function of BookEditorMonaco
 */
export function ensureBookEditorMonacoLanguageForEditor(props: EnsureBookEditorMonacoLanguageForEditorProps): void {
    const { monaco, monacoEditor } = props;
    ensureBookEditorMonacoLanguage(monaco);

    const model = monacoEditor.getModel();
    if (!model) {
        return;
    }

    if (model.getLanguageId() !== BookEditorMonacoConstants.BOOK_LANGUAGE_ID) {
        monaco.editor.setModelLanguage(model, BookEditorMonacoConstants.BOOK_LANGUAGE_ID);
    }

    monaco.editor.setTheme(BookEditorMonacoConstants.BOOK_THEME_ID);
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
