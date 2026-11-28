import { writeFile } from 'fs/promises';
import type { PromptFile } from './types/PromptFile';

/**
 * Writes updated prompt file content to disk.
 */
export async function writePromptFile(file: PromptFile): Promise<void> {
    await writeFile(file.path, buildPromptFileContent(file), 'utf-8');
}

/** Serializes a status candidate identically for private-tree persistence and ordinary prompt writes. */
export function buildPromptFileContent(file: PromptFile): string {
    return file.lines.join(file.eol) + (file.hasFinalEol ? file.eol : '');
}
