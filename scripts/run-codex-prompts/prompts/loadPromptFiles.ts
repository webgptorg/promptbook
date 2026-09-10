import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import type { PromptFile } from './types/PromptFile';
import { parsePromptFile } from './parsePromptFile';

/**
 * HTML comment which excludes a Markdown file from all `ptbk coder` queues.
 *
 * @private internal constant of `loadPromptFiles`
 */
const PTBK_CODER_IGNORE_MARKER = '<!--ptbk-coder-ignore-->';

/**
 * Loads and parses prompt files from the prompts directory, excluding files marked for `ptbk coder` to ignore.
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

        if (content.includes(PTBK_CODER_IGNORE_MARKER)) {
            continue;
        }

        promptFiles.push(parsePromptFile(filePath, content));
    }

    return promptFiles;
}
