import { readFile, writeFile } from 'fs/promises';
import { parsePromptFile } from '../prompts/parsePromptFile';

/**
 * Result of overwriting one prompt section from the coder server UI.
 *
 * @private internal type of `ptbk coder server`
 */
export type UpdatePromptSectionResult = {
    readonly changed: boolean;
};

/**
 * Overwrites the body of one prompt section with new content, preserving the status line.
 *
 * The `newContent` string is the prompt text without the status marker.
 * The status line (`[ ]`, `[x]`, `[!]`, `[.]`, `[-]`) is kept intact.
 *
 * @private internal utility of `ptbk coder server`
 */
export async function updatePromptSection(
    filePath: string,
    sectionIndex: number,
    newContent: string,
): Promise<UpdatePromptSectionResult> {
    const rawContent = await readFile(filePath, 'utf-8');
    const promptFile = parsePromptFile(filePath, rawContent);
    const section = promptFile.sections.find((s) => s.index === sectionIndex);

    if (!section) {
        throw new Error(`Section ${sectionIndex} not found in file: ${filePath}`);
    }

    // Lines before the status line (usually empty lines at section start)
    const linesBeforeStatus =
        section.statusLineIndex !== undefined
            ? promptFile.lines.slice(section.startLine, section.statusLineIndex)
            : [];

    // The status line itself (preserved exactly)
    const statusLineContent =
        section.statusLineIndex !== undefined ? [promptFile.lines[section.statusLineIndex]!] : [];

    // Split the new content and trim trailing blank lines
    const newContentLines = newContent.split(/\r?\n/);
    while (newContentLines.length > 0 && newContentLines[newContentLines.length - 1]?.trim() === '') {
        newContentLines.pop();
    }

    // Build the reconstructed section lines
    const newSectionLines = [
        ...linesBeforeStatus,
        ...statusLineContent,
        ...(statusLineContent.length > 0 ? [''] : []),
        ...newContentLines,
    ];

    // Splice the new section lines into the full file line array
    const updatedLines = [
        ...promptFile.lines.slice(0, section.startLine),
        ...newSectionLines,
        ...promptFile.lines.slice(section.endLine + 1),
    ];

    const updatedContent =
        updatedLines.join(promptFile.eol) + (promptFile.hasFinalEol ? promptFile.eol : '');

    if (updatedContent === rawContent) {
        return { changed: false };
    }

    await writeFile(filePath, updatedContent, 'utf-8');
    return { changed: true };
}

// Note: [🟡] Code for CLI command [coder server](scripts/run-codex-prompts/server/updatePromptSection.ts) should never be published outside of `@promptbook/cli`
