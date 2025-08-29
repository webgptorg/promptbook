import type { ExportFormat } from './ExportFormat';

/**
 * Utility: add UTM parameters to a URL for tracking
 *
 * @private utility of `<Chat/>` component
 */
export function addUtmParamsToUrl(baseUrl: string, format: ExportFormat): string {
    const urlObj = new URL(baseUrl);
    const params = new URLSearchParams(urlObj.search);
    if (!params.has('utm_source')) params.set('utm_source', 'promptbook-studio');
    params.set('utm_medium', 'export');
    params.set('utm_campaign', 'chat-history-share');
    params.set('utm_content', format);
    urlObj.search = params.toString();
    return urlObj.toString();
}
