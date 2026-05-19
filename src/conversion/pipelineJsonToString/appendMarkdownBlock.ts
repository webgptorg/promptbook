import { spaceTrim } from 'spacetrim';
import type { string_markdown } from '../../types/string_markdown';

/**
 * Appends one markdown block to an existing markdown document.
 *
 * @private internal utility of `pipelineJsonToString`
 */
export function appendMarkdownBlock(
    pipelineString: string_markdown,
    markdownBlock: string_markdown,
): string_markdown {
    return spaceTrim(
        (block) => `
            ${block(pipelineString)}

            ${block(markdownBlock)}
        `,
    );
}
