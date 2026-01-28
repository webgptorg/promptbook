import { writeFile } from 'fs/promises';
import type { PromptFile } from './types/PromptFile';

/**
 * Writes updated prompt file content to disk.
 */
export async function writePromptFile(file: PromptFile): Promise<void> {
    const content = file.lines.join(file.eol) + (file.hasFinalEol ? file.eol : '');
    await writeFile(file.path, content, 'utf-8');
}
