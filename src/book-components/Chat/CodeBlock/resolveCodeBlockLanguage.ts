/**
 * Monaco language identifiers supported for markdown code snippets.
 *
 * @private internal helper of `<CodeBlock/>`
 */
export type MonacoCodeBlockLanguage =
    | 'javascript'
    | 'typescript'
    | 'html'
    | 'css'
    | 'python'
    | 'shell'
    | 'json'
    | 'sql'
    | 'book'
    | 'plaintext';

/**
 * Alias mapping from markdown fenced-code language labels to Monaco identifiers.
 *
 * @private internal helper of `<CodeBlock/>`
 */
const CODE_BLOCK_LANGUAGE_ALIASES: Readonly<Record<string, MonacoCodeBlockLanguage>> = {
    js: 'javascript',
    javascript: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',

    ts: 'typescript',
    typescript: 'typescript',
    tsx: 'typescript',

    html: 'html',
    htm: 'html',

    css: 'css',

    py: 'python',
    python: 'python',

    shell: 'shell',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',

    json: 'json',
    jsonc: 'json',

    sql: 'sql',
    mysql: 'sql',
    postgresql: 'sql',
    postgres: 'sql',
    sqlite: 'sql',

    book: 'book',
};

/**
 * Resolves a markdown fenced-code language label into a Monaco language identifier.
 *
 * Unknown languages intentionally resolve to `plaintext` so unsupported snippets render
 * as readable text without syntax highlighting.
 *
 * @param language - Raw markdown code fence language label (for example `ts`, `typescript`, `bash`).
 * @returns Canonical Monaco language identifier.
 *
 * @private internal helper of `<CodeBlock/>`
 */
export function resolveCodeBlockLanguage(language: string | undefined): MonacoCodeBlockLanguage {
    const normalizedLanguage = language?.trim().toLowerCase();
    if (!normalizedLanguage) {
        return 'plaintext';
    }

    return CODE_BLOCK_LANGUAGE_ALIASES[normalizedLanguage] || 'plaintext';
}
