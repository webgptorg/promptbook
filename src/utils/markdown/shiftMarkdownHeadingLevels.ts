import type { string_markdown } from '../../types/string_markdown';

/**
 * Deepest heading level markdown supports.
 *
 * @private internal constant of `shiftMarkdownHeadingLevels`
 */
const MAX_MARKDOWN_HEADING_LEVEL = 6;

/**
 * Matches one ATX heading at the beginning of a line.
 *
 * @private internal constant of `shiftMarkdownHeadingLevels`
 */
const MARKDOWN_HEADING_REGEX = /^(#{1,6})(\s)/;

/**
 * Matches a fenced code-block delimiter.
 *
 * @private internal constant of `shiftMarkdownHeadingLevels`
 */
const MARKDOWN_CODE_FENCE_REGEX = /^\s*(```|~~~)/;

/**
 * Moves every heading of a markdown document deeper into the hierarchy.
 *
 * This is needed when an independent markdown document is embedded under an
 * existing heading, so that the merged document keeps one consistent outline.
 * Headings inside fenced code blocks are left untouched.
 *
 * @param markdown - Markdown document to shift.
 * @param headingLevelShift - How many levels the headings should move down.
 * @returns Markdown with shifted headings.
 *
 * @private internal utility for composing markdown documents
 */
export function shiftMarkdownHeadingLevels(markdown: string_markdown, headingLevelShift: number): string_markdown {
    if (headingLevelShift <= 0) {
        return markdown;
    }

    let isInsideCodeBlock = false;

    return markdown
        .split('\n')
        .map((line) => {
            if (MARKDOWN_CODE_FENCE_REGEX.test(line)) {
                isInsideCodeBlock = !isInsideCodeBlock;
                return line;
            }

            if (isInsideCodeBlock) {
                return line;
            }

            return line.replace(MARKDOWN_HEADING_REGEX, (_match, headingPrefix: string, whitespace: string) => {
                const shiftedLevel = Math.min(headingPrefix.length + headingLevelShift, MAX_MARKDOWN_HEADING_LEVEL);

                return `${'#'.repeat(shiftedLevel)}${whitespace}`;
            });
        })
        .join('\n') as string_markdown;
}
