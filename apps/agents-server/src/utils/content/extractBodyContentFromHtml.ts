import type { string_html } from '@promptbook-local/types';

/**
 * Extract the first heading from HTML
 *
 * @param contentText HTML
 * @returns heading
 */
export function extractBodyContentFromHtml(html: string_html): string_html {
    // Note: Not using DOMParser, because it's overkill for this simple task

    const match = html.match(/<body[^>]*>(?<bodyContent>[\s\S]*)<\/body>/s);

    if (!match) {
        return html;
    }

    return match.groups!.bodyContent!;
}
