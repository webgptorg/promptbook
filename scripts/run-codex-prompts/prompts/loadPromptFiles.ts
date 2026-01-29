import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import type { PromptFile } from './types/PromptFile';
import { parsePromptFile } from './parsePromptFile';

/**
 * Loads and parses prompt files from the prompts directory.
 */
export async function loadPromptFiles(promptsDir: string): Promise<PromptFile[]> {
    const entries = await readdir(promptsDir, { withFileTypes: true });
    const files = entries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
        .map((entry) => join(promptsDir, entry.name))
        .sort((a, b) => a.localeCompare(b));

    const promptFiles: PromptFile[] = [];
    for (const filePath of files) {
        const content = await readFile(filePath, 'utf-8');
        promptFiles.push(parsePromptFile(filePath, content));
    }

    return promptFiles;
}
