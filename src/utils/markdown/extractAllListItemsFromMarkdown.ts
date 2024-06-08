import { string_markdown, string_markdown_text } from '../.././types/typeAliases';

/**
 * Utility function to extract all list items from markdown
 *
 * Note: It works with both ul and ol
 * Note: It omits list items in code blocks
 * Note: It flattens nested lists
 * Note: It can not work with html syntax and comments
 *
 * @param markdown any valid markdown
 * @returns
 */
export function extractAllListItemsFromMarkdown(markdown: string_markdown): string_markdown_text[] {
    const lines = markdown.split('\n');
    const listItems: string_markdown_text[] = [];

    let isInCodeBlock = false;

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('```')) {
            isInCodeBlock = !isInCodeBlock;
        }

        if (!isInCodeBlock && (trimmedLine.startsWith('-') || trimmedLine.match(/^\d+\./))) {
            const listItem = trimmedLine.replace(/^-|\d+\./, '').trim();
            listItems.push(listItem);
        }
    }

    return listItems;
}
