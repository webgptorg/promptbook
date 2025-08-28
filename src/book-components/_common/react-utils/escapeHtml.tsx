/**
 * Escape HTML to safely render user text inside a <pre> with dangerouslySetInnerHTML.
 *
 * @private within the promptbook components <- TODO: Maybe make promptbook util from this
 */
export function escapeHtml(input: string): string {
    return input.replaceAll(/&/g, '&amp;').replaceAll(/</g, '&lt;').replaceAll(/>/g, '&gt;');
}
