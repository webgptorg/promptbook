import { MarkdownStructure } from "./MarkdownStructure";


/**
 * Computes the deepness of the markdown structure.
 * 
 * @private within the library
 */
export function countMarkdownStructureDeepness(markdownStructure: MarkdownStructure): number {
    let maxDeepness = 0;
    for (const section of markdownStructure.sections) {
        maxDeepness = Math.max(maxDeepness, countMarkdownStructureDeepness(section));
    }
    return maxDeepness + 1;
}