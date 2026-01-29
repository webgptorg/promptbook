import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';
import { trimEmptyEdges } from './trimEmptyEdges';

/**
 * Extracts prompt lines without the status marker.
 */
export function buildPromptLinesWithoutStatus(file: PromptFile, section: PromptSection): string[] {
    const lines = file.lines.slice(section.startLine, section.endLine + 1);

    if (section.statusLineIndex !== undefined) {
        const relativeIndex = section.statusLineIndex - section.startLine;
        if (relativeIndex >= 0 && relativeIndex < lines.length) {
            lines.splice(relativeIndex, 1);
        }
    }

    return trimEmptyEdges(lines);
}
