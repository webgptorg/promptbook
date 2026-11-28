import { spaceTrim } from 'spacetrim';

/**
 * Remove comments from the markdown content
 *
 * @param content The markdown content
 * @returns The markdown content without comments
 */
export function removeComments(content: string): string {
    // First, let's identify and temporarily protect code blocks and inline code
    // Store them in arrays to restore them later
    const codeBlocks: string[] = [];
    const inlineCode: string[] = [];

    // Replace code blocks (```...```) with placeholders
    let processedContent = content.replace(/```[\s\S]*?```/g, (match) => {
        const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
        codeBlocks.push(match);
        return placeholder;
    });

    // Replace inline code (`...`) with placeholders
    processedContent = processedContent.replace(/`[^`]*`/g, (match) => {
        const placeholder = `__INLINE_CODE_${inlineCode.length}__`;
        inlineCode.push(match);
        return placeholder;
    });

    // Now remove HTML comments from the remaining content
    processedContent = processedContent.replace(/<!--([\s\S]*?)-->/g, '');

    // Restore code blocks and inline code
    for (let i = 0; i < codeBlocks.length; i++) {
        const placeholder = `__CODE_BLOCK_${i}__`;
        const replacement = codeBlocks[i];
        processedContent = processedContent.split(placeholder).join(replacement);
    }

    for (let i = 0; i < inlineCode.length; i++) {
        const placeholder = `__INLINE_CODE_${i}__`;
        const replacement = inlineCode[i];
        processedContent = processedContent.split(placeholder).join(replacement);
    }

    return spaceTrim(processedContent);
}
