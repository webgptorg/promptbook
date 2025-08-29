/**
 * Simple HTML escape to safely render injected text in HTML exports
 * 
 * @private utility of `<Chat/>` component
 */
export function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
