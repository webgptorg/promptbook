/**
 * Replacement table for characters that must never reach raw HTML output.
 *
 * @private internal constant of `escapeHtml`
 */
const HTML_ESCAPE_REPLACEMENTS: Readonly<Record<string, string>> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

/**
 * Escapes text so it can be safely inserted into HTML markup or an HTML attribute.
 *
 * @param value - Plain text value.
 * @returns HTML-safe text.
 *
 * @private internal utility for building standalone HTML documents
 */
export function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => HTML_ESCAPE_REPLACEMENTS[character] || character);
}
