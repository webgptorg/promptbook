import type { string_html } from '../../types/typeAliases';

/**
 * Prettify the html code
 *
 * @param content raw html code
 * @returns formatted html code
 * @private withing the package because of HUGE size of prettier dependency
 */
export function prettifyMarkdown<TContent extends string_html>(content: TContent): TContent {
    // In browser/Next.js environments, just return the original content
    // since prettier parsers are not available and would cause bundling issues
    if (typeof window !== 'undefined') {
        return content;
    }

    try {
        // Use dynamic require to avoid static imports that cause bundling issues
        // This will only work in Node.js environments
        const prettierStandalone = eval('require')('prettier/standalone');
        const parserMarkdown = eval('require')('prettier/parser-markdown');
        const parserHtml = eval('require')('prettier/parser-html');

        return prettierStandalone.format(content, {
            parser: 'markdown',
            plugins: [parserMarkdown, parserHtml],

            // TODO: DRY - make some import or auto-copy of .prettierrc
            endOfLine: 'lf',
            tabWidth: 4,
            singleQuote: true,
            trailingComma: 'all',
            arrowParens: 'always',
            printWidth: 120,
            htmlWhitespaceSensitivity: 'ignore',
            jsxBracketSameLine: false,
            bracketSpacing: true,
        }) as TContent;
    } catch (error) {
        // TODO: [🟥] Detect browser / node and make it colorful
        console.error('There was an error with prettifying the markdown, using the original as the fallback', {
            error,
            html: content,
        });
        return content;
    }
}

/**
 * Async version of prettifyMarkdown using dynamic imports
 *
 * @param content raw html code
 * @returns formatted html code
 * @private withing the package because of HUGE size of prettier dependency
 */
export async function prettifyMarkdownAsync<TContent extends string_html>(content: TContent): Promise<TContent> {
    try {
        // Use dynamic imports to avoid bundling issues in browser/Next.js environments
        const [{ format }, parserMarkdown, parserHtml] = await Promise.all([
            import('prettier/standalone'),
            import('prettier/parser-markdown'),
            import('prettier/parser-html'),
        ]);

        return format(content, {
            parser: 'markdown',
            plugins: [parserMarkdown.default, parserHtml.default],

            // TODO: DRY - make some import or auto-copy of .prettierrc
            endOfLine: 'lf',
            tabWidth: 4,
            singleQuote: true,
            trailingComma: 'all',
            arrowParens: 'always',
            printWidth: 120,
            htmlWhitespaceSensitivity: 'ignore',
            jsxBracketSameLine: false,
            bracketSpacing: true,
        }) as TContent;
    } catch (error) {
        // TODO: [🟥] Detect browser / node and make it colorful
        console.error('There was an error with prettifying the markdown, using the original as the fallback', {
            error,
            html: content,
        });
        return content;
    }
}
