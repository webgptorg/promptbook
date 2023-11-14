import { string_markdown } from '../.././types/typeAliases';

/**
 * Extracts all code blocks from markdown.
 *
 * @param markdown any valid markdown
 * @returns code blocks with language and content
 */
export function extractBlocksFromMarkdown(
    markdown: string_markdown,
): Array<{ language: string | null; content: string }> {
    const codeBlocks: { language: string | null; content: string }[] = [];
    const lines = markdown.split('\n');

    let currentLanguage: string | null = null;
    let currentBlock: string[] = [];

    for (const line of lines) {
        if (line.startsWith('```')) {
            if (currentLanguage !== null) {
                codeBlocks.push({ language: currentLanguage.trim() || null, content: currentBlock.join('\n') });
                currentLanguage = null;
                currentBlock = [];
            } else {
                currentLanguage = line.slice(3).trim();
            }
        } else if (currentLanguage !== null) {
            currentBlock.push(line);
        }
    }

    if (currentLanguage !== null) {
        codeBlocks.push({ language: currentLanguage.trim() || null, content: currentBlock.join('\n') });
    }

    return codeBlocks;
}
