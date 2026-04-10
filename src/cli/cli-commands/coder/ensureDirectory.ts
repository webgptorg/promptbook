import { mkdir, stat } from 'fs/promises';
import { join } from 'path';
import type { InitializationStatus } from './boilerplateTemplates';

/**
 * Ensures a relative directory exists in the project root.
 *
 * @private function of `initializeCoderProjectConfiguration`
 */
export async function ensureDirectory(projectPath: string, relativeDirectoryPath: string): Promise<InitializationStatus> {
    const directoryPath = join(projectPath, relativeDirectoryPath);
    const isDirectoryExisting = await isExistingDirectory(directoryPath);

    if (!isDirectoryExisting) {
        await mkdir(directoryPath, { recursive: true });
        return 'created';
    }

    return 'unchanged';
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

// Note: [🟡] Code for coder init directory creation [ensureDirectory](src/cli/cli-commands/coder/ensureDirectory.ts) should never be published outside of `@promptbook/cli`
