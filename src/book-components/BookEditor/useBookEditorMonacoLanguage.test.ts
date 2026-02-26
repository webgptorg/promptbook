import { describe, expect, it, jest } from '@jest/globals';
import { ensureBookEditorMonacoLanguage } from './useBookEditorMonacoLanguage';

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
});
