import { writeFile } from 'fs/promises';
import type { PromptFile } from './types/PromptFile';
import { relative } from 'path';
import { writeConfinedWorkspaceFile } from '../workspace/workspaceAgentFiles';

/**
 * Writes updated prompt file content to disk.
 */
export async function writePromptFile(file: PromptFile): Promise<void> {
    const content = file.lines.join(file.eol) + (file.hasFinalEol ? file.eol : '');
    if (file.workspaceProjectPath && file.expectedContent !== undefined) {
        await writeConfinedWorkspaceFile(
            file.workspaceProjectPath,
            relative(file.workspaceProjectPath, file.path).replace(/\\/gu, '/'),
            file.expectedContent,
            content,
            'prompts',
        );
        file.expectedContent = content;
        return;
    }
    await writeFile(file.path, content, 'utf-8');
}
