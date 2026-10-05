import { readFile } from 'fs/promises';
import { CoderGitOperationError } from '../git/CoderGitOperationError';
import { parsePromptFile } from './parsePromptFile';
import type { PromptSelection } from './types/PromptSelection';

/**
 * Refreshes on-disk task content before a Coder status write. The caller owns a validated mutation boundary;
 * agent/check edits to the task body must survive status persistence just like edits to any other file.
 */
export async function refreshPromptSelection(selection: PromptSelection): Promise<void> {
    try {
        const currentFile = parsePromptFile(selection.file.path, await readFile(selection.file.path, 'utf-8'));
        const currentSection = currentFile.sections[selection.section.index];
        if (!currentSection)
            throw new CoderGitOperationError(
                'record',
                `The selected task section disappeared from \`${selection.file.path}\`. Its edited content was retained.`,
            );
        Object.assign(selection.section, currentSection);
        Object.assign(selection.file, currentFile, {
            sections: currentFile.sections.map((section) =>
                section.index === selection.section.index ? selection.section : section,
            ),
        });
    } catch (error) {
        if (error instanceof CoderGitOperationError) throw error;
        throw new CoderGitOperationError('record', error instanceof Error ? error.message : String(error));
    }
}
