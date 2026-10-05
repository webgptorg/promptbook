import { stat, writeFile } from 'fs/promises';
import { join } from 'path';
import type { ProjectInitializationStatus } from './projectInitialization';

/**
 * Creates one project text file with default content, preserving any existing file.
 *
 * @private internal utility of Promptbook CLI project initialization
 */
export async function ensureProjectTextFile(
    projectPath: string,
    relativeFilePath: string,
    fileContent: string,
): Promise<ProjectInitializationStatus> {
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

// Note: [🟡] Code for project text file bootstrapping [ensureProjectTextFile](src/cli/cli-commands/common/ensureProjectTextFile.ts) should never be published outside of `@promptbook/cli`
