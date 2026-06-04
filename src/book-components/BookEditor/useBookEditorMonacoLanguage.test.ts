import { describe, expect, it, jest } from '@jest/globals';
import type { editor, Position } from 'monaco-editor';
import { PROMPTBOOK_SYNTAX_COLORS } from '../../config';
import { ensureBookEditorMonacoLanguage, ensureBookEditorMonacoLanguageForEditor } from './useBookEditorMonacoLanguage';

/**
 * Monaco argument type accepted by the Book language initializer.
 */
type MonacoForBookEditorLanguage = Parameters<typeof ensureBookEditorMonacoLanguage>[0];

/**
 * Bundles mocked Monaco instance together with the tracked spy functions.
 */
type MonacoLanguageMock = {
    readonly monaco: MonacoForBookEditorLanguage;
    readonly spies: {
        readonly registerLanguage: ReturnType<typeof jest.fn>;
        readonly setMonarchTokensProvider: ReturnType<typeof jest.fn>;
        readonly registerCompletionItemProvider: ReturnType<typeof jest.fn>;
        readonly registerLinkProvider: ReturnType<typeof jest.fn>;
        readonly defineTheme: ReturnType<typeof jest.fn>;
        readonly setTheme: ReturnType<typeof jest.fn>;
        readonly setModelLanguage: ReturnType<typeof jest.fn>;
    };
};

/**
 * Creates a lightweight Monaco mock for language-registration tests.
 */
function createMonacoLanguageMock(): MonacoLanguageMock {
    const registerLanguage = jest.fn();
    const setMonarchTokensProvider = jest.fn(() => ({ dispose: jest.fn() }));
    const registerCompletionItemProvider = jest.fn(() => ({ dispose: jest.fn() }));
    const registerLinkProvider = jest.fn(() => ({ dispose: jest.fn() }));
    const defineTheme = jest.fn();
    const setTheme = jest.fn();
    const setModelLanguage = jest.fn();

    const monaco = {
        languages: {
            register: registerLanguage,
            setMonarchTokensProvider,
            registerCompletionItemProvider,
            registerLinkProvider,
            CompletionItemKind: {
                Keyword: 17,
            },
        },
        editor: {
            defineTheme,
            setTheme,
            setModelLanguage,
        },
        Range: jest.fn(),
    } as unknown as MonacoForBookEditorLanguage;

    return {
        monaco,
        spies: {
            registerLanguage,
            setMonarchTokensProvider,
            registerCompletionItemProvider,
            registerLinkProvider,
            defineTheme,
            setTheme,
            setModelLanguage,
        },
    };
}

describe('ensureBookEditorMonacoLanguage', () => {
    it('registers language providers only once for a Monaco instance', () => {
        const { monaco, spies } = createMonacoLanguageMock();

        ensureBookEditorMonacoLanguage(monaco);
        ensureBookEditorMonacoLanguage(monaco);

        expect(spies.registerLanguage).toHaveBeenCalledTimes(1);
        expect(spies.setMonarchTokensProvider).toHaveBeenCalledTimes(1);
        expect(spies.registerCompletionItemProvider).toHaveBeenCalledTimes(1);
        expect(spies.registerLinkProvider).toHaveBeenCalledTimes(1);
        expect(spies.defineTheme).toHaveBeenCalledTimes(1);
        expect(spies.setTheme).toHaveBeenCalledTimes(2);
    });

    it('registers each Monaco instance independently', () => {
        const first = createMonacoLanguageMock();
        const second = createMonacoLanguageMock();

        ensureBookEditorMonacoLanguage(first.monaco);
        ensureBookEditorMonacoLanguage(second.monaco);

        expect(first.spies.registerLanguage).toHaveBeenCalledTimes(1);
        expect(second.spies.registerLanguage).toHaveBeenCalledTimes(1);
    });

    it('keeps the Monaco Book theme light even when the host application theme is dark', () => {
        const { monaco, spies } = createMonacoLanguageMock();

        ensureBookEditorMonacoLanguage(monaco, 'DARK');

        const themeConfig = spies.defineTheme.mock.calls[0]?.[1] as {
            readonly base: string;
            readonly colors: Record<string, string>;
        };

        expect(themeConfig.base).toBe('vs');
        expect(themeConfig.colors).not.toHaveProperty('editor.background');
    });

    it('registers NOTE/TODO commitment tokenization states and dedicated theme rules', () => {
        const { monaco, spies } = createMonacoLanguageMock();

        ensureBookEditorMonacoLanguage(monaco);

        const monarchConfig = spies.setMonarchTokensProvider.mock.calls[0]?.[1] as {
            readonly tokenizer: {
                readonly body: ReadonlyArray<readonly [RegExp, string, string?]>;
                readonly 'agent-reference-body': ReadonlyArray<readonly [RegExp, string, string?]>;
                readonly 'note-commitment-body': ReadonlyArray<readonly [RegExp, string, string?]>;
                readonly 'todo-commitment-body': ReadonlyArray<readonly [RegExp, string, string?]>;
                readonly codeblock: ReadonlyArray<readonly [RegExp, string, string?]>;
            };
        };
        const themeConfig = spies.defineTheme.mock.calls[0]?.[1] as {
            readonly rules: ReadonlyArray<{
                readonly token: string;
                readonly foreground?: string;
                readonly background?: string;
            }>;
        };

        expect(
            monarchConfig.tokenizer.body.some(
                (rule) => rule[1] === 'note-commitment' && rule[2] === '@note-commitment-body',
            ),
        ).toBe(true);
        expect(
            monarchConfig.tokenizer.body.some(
                (rule) => rule[1] === 'todo-commitment' && rule[2] === '@todo-commitment-body',
            ),
        ).toBe(true);
        expect(
            monarchConfig.tokenizer['agent-reference-body'].some(
                (rule) => rule[1] === 'note-commitment' && rule[2] === '@note-commitment-body',
            ),
        ).toBe(true);
        expect(
            monarchConfig.tokenizer['agent-reference-body'].some(
                (rule) => rule[1] === 'todo-commitment' && rule[2] === '@todo-commitment-body',
            ),
        ).toBe(true);
        expect(monarchConfig.tokenizer['note-commitment-body'].some((rule) => rule[1] === 'note-commitment')).toBe(
            true,
        );
        expect(monarchConfig.tokenizer['todo-commitment-body'].some((rule) => rule[1] === 'todo-commitment')).toBe(
            true,
        );

        const noteThemeRule = themeConfig.rules.find((rule) => rule.token === 'note-commitment');
        const todoThemeRule = themeConfig.rules.find((rule) => rule.token === 'todo-commitment');
        expect(noteThemeRule?.foreground).toBe(PROMPTBOOK_SYNTAX_COLORS.NOTE_COMMITMENT.toHex());
        expect(todoThemeRule?.foreground).toBe(PROMPTBOOK_SYNTAX_COLORS.TODO_COMMITMENT_TEXT.toHex());
        expect(todoThemeRule?.background).toBe(PROMPTBOOK_SYNTAX_COLORS.TODO_COMMITMENT_BACKGROUND.toHex());
    });

    it('prioritizes important commitments in completion suggestions', () => {
        const { monaco, spies } = createMonacoLanguageMock();

        ensureBookEditorMonacoLanguage(monaco);

        const completionProvider = spies.registerCompletionItemProvider.mock.calls[0]?.[1] as {
            readonly provideCompletionItems: (
                model: { getWordUntilPosition: (position: Position) => { startColumn: number; endColumn: number } },
                position: Position,
            ) => { suggestions: Array<{ label: string; sortText?: string }> };
        };

        const completionResult = completionProvider.provideCompletionItems(
            {
                getWordUntilPosition: () => ({ startColumn: 1, endColumn: 1 }),
            } as unknown as editor.ITextModel,
            { lineNumber: 1, column: 1 } as Position,
        );

        const suggestionLabels = completionResult.suggestions.map(({ label }) => label);
        expect(suggestionLabels[0]).toBe('GOAL');
        expect(suggestionLabels.indexOf('GOAL')).toBeLessThan(suggestionLabels.indexOf('RULE'));
        expect(suggestionLabels.indexOf('RULE')).toBeLessThan(suggestionLabels.indexOf('KNOWLEDGE'));
        expect(suggestionLabels.indexOf('KNOWLEDGE')).toBeLessThan(suggestionLabels.indexOf('TEAM'));
        expect(suggestionLabels[suggestionLabels.length - 1]).toBe('REMOVE');
        expect(
            completionResult.suggestions.every(
                (suggestion, index) => suggestion.sortText === index.toString().padStart(4, '0'),
            ),
        ).toBe(true);
    });

    it('accepts indented fenced-code delimiters in tokenizer rules', () => {
        const { monaco, spies } = createMonacoLanguageMock();

        ensureBookEditorMonacoLanguage(monaco);

        const monarchConfig = spies.setMonarchTokensProvider.mock.calls[0]?.[1] as {
            readonly tokenizer: {
                readonly body: ReadonlyArray<readonly [RegExp, string, string?]>;
                readonly codeblock: ReadonlyArray<readonly [RegExp, string, string?]>;
            };
        };

        const bodyCodeBlockRule = monarchConfig.tokenizer.body.find((rule) => rule[2] === '@codeblock');
        const codeBlockClosingRule = monarchConfig.tokenizer.codeblock.find((rule) => rule[2] === '@pop');

        expect(bodyCodeBlockRule?.[0].test('```markdown')).toBe(true);
        expect(bodyCodeBlockRule?.[0].test('   ```markdown')).toBe(true);
        expect(codeBlockClosingRule?.[0].test('```')).toBe(true);
        expect(codeBlockClosingRule?.[0].test('   ```')).toBe(true);
    });

    it('re-applies Book model language when mounted editor uses a different language', () => {
        const { monaco, spies } = createMonacoLanguageMock();
        const monacoEditor = {
            getModel: () => ({
                getLanguageId: () => 'plaintext',
            }),
        };

        ensureBookEditorMonacoLanguageForEditor({
            monaco,
            monacoEditor: monacoEditor as unknown as Parameters<
                typeof ensureBookEditorMonacoLanguageForEditor
            >[0]['monacoEditor'],
        });

        expect(spies.setModelLanguage).toHaveBeenCalledTimes(1);
        expect(spies.setModelLanguage).toHaveBeenCalledWith(expect.anything(), 'book');
    });
});
