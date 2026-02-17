import { stripMarkdownText } from './stripMarkdownText';

/**
 * Converts Markdown text into a short, clean string that is suitable for UI
 * previews (chat shortcuts, history panels, etc.) by stripping markup while
 * preserving the readable message content.
 *
 * @param text - Markdown-formatted chat content.
 * @returns Text ready for display; returns an empty string when the input is empty.
 */
export function textToPreviewText(text: string | null | undefined): string {
    if (!text) {
        return '';
    }

    return stripMarkdownText(text.toString());
}
