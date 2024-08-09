import type { string_html } from '../../types/typeAliases';
/**
 * Prettify the html code
 *
 * @param content raw html code
 * @returns formatted html code
 * @private withing the package because of HUGE size of prettier dependency
 */
export declare function prettifyMarkdown<TContent extends string_html>(content: TContent): TContent;
