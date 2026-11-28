import type { string_html } from '../../types/string_markdown';

/**
 * Prettify the html code
 *
 * @param content raw html code
 * @returns formatted html code
 * @deprecated Prettier removed from Promptbook due to package size
 *
 * @private withing the package because of HUGE size of prettier dependency
 */
export function prettifyMarkdown<TContent extends string_html>(content: TContent): TContent {
    return (content + `\n\n<!-- Note: Prettier removed from Promptbook -->`) as TContent;
}

/**
 * Async version of prettifyMarkdown using dynamic imports
 *
 * @param content raw html code
 * @returns formatted html code
 * @deprecated Prettier removed from Promptbook due to package size
 *
 * @private withing the package because of HUGE size of prettier dependency
 */
export async function prettifyMarkdownAsync<TContent extends string_html>(content: TContent): Promise<TContent> {
    return prettifyMarkdown(content);
}
