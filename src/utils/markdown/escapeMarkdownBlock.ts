import { string_markdown_text } from '../../types/typeAliases';

/**
 * Function escapeMarkdownBlock will escape markdown block if needed
 * It is useful when you want have block in block
 */

export function escapeMarkdownBlock(value: string_markdown_text): string_markdown_text {
    return value.replace(/```/g, '\\`\\`\\`');
}
