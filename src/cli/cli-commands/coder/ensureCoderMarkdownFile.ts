import { stat, writeFile } from 'fs/promises';
import { join } from 'path';
import type { InitializationStatus } from './boilerplateTemplates';

/**
 * Ensures one coder markdown file exists with the provided default boilerplate.
 *
 * @private function of `initializeCoderProjectConfiguration`
 */
export async function ensureCoderMarkdownFile(
    projectPath: string,
    relativeFilePath: string,
    fileContent: string,
): Promise<InitializationStatus> {
    const absoluteFilePath = join(projectPath, relativeFilePath);
    if (await isExistingFile(absoluteFilePath)) {
        return 'unchanged';
    }

    await writeFile(absoluteFilePath, `${fileContent}\n`, 'utf-8');
    return 'created';
}

/**
 * Checks whether a path exists and is a file.
 */
async function isExistingFile(path: string): Promise<boolean> {
    try {
        return (await stat(path)).isFile();
    } catch {
        return false;
    }
}

// Note: [🟡] Code for coder init markdown bootstrapping [ensureCoderMarkdownFile](src/cli/cli-commands/coder/ensureCoderMarkdownFile.ts) should never be published outside of `@promptbook/cli`
