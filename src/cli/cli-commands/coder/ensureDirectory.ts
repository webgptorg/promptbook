import { mkdir, readdir, stat } from 'fs/promises';
import { join } from 'path';
import type { InitializationStatus } from './boilerplateTemplates';

/**
 * Ensures a relative directory exists in the project root.
 *
 * @private function of `initializeCoderProjectConfiguration`
 */
export async function ensureDirectory(
    projectPath: string,
    relativeDirectoryPath: string,
): Promise<InitializationStatus> {
    const directoryPath = join(projectPath, relativeDirectoryPath);
    const isDirectoryExisting = await isExistingDirectory(directoryPath);

    if (!isDirectoryExisting) {
        await mkdir(directoryPath, { recursive: true });
        return 'created';
    }

    return 'unchanged';
}

/**
 * Checks whether a project-relative directory is missing or contains no entries.
 *
 * @private internal utility of `coder init` command
 */
export async function isDirectoryEmpty(projectPath: string, relativeDirectoryPath: string): Promise<boolean> {
    const directoryPath = join(projectPath, relativeDirectoryPath);

    try {
        return (await readdir(directoryPath)).length === 0;
    } catch (error) {
        if (isNodeJsErrorWithCode(error, 'ENOENT')) {
            return true;
        }

        throw error;
    }
}

/**
 * Checks whether a path exists and is a directory.
 */
async function isExistingDirectory(path: string): Promise<boolean> {
    try {
        return (await stat(path)).isDirectory();
    } catch {
        return false;
    }
}

/**
 * Checks whether a caught value is a Node.js error with the given error code.
 */
function isNodeJsErrorWithCode(error: unknown, code: string): error is NodeJS.ErrnoException {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

// Note: [🟡] Code for coder init directory creation [ensureDirectory](src/cli/cli-commands/coder/ensureDirectory.ts) should never be published outside of `@promptbook/cli`
