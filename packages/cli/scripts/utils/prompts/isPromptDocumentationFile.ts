import { basename } from 'path';

/**
 * Reserves the prompts README for documentation, regardless of its contents or filename case.
 * Other Markdown filenames remain valid PRDs, including names which contain the word "readme".
 */
export function isPromptDocumentationFile(filePath: string): boolean {
    return basename(filePath).toLowerCase() === 'readme.md';
}
