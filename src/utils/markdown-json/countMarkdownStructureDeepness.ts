import type { MarkdownStructure } from './MarkdownStructure';

/**
 * Computes the deepness of the markdown structure.
 *
 * @private within the package
 */
export function countMarkdownStructureDeepness(markdownStructure: MarkdownStructure): number {
    let maxDeepness = 0;
    for (const section of markdownStructure.sections) {
        maxDeepness = Math.max(maxDeepness, countMarkdownStructureDeepness(section));
    }
    return maxDeepness + 1;
}
