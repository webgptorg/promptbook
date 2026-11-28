import { readFile } from 'fs/promises';
import { FindAllProjectFilesOptions, findAllProjectFiles } from './findAllProjectFiles';

/**
 * Reads all project files.
 */
export async function readAllProjectFiles(
    options: FindAllProjectFilesOptions = {},
): Promise<ReadonlyArray<{ path: string; content: string }>> {
    return await Promise.all(
        (
            await findAllProjectFiles(options)
        ).map(async (path) => ({
            path,
            content: await readFile(path, 'utf-8'),
        })),
    );
}

// Note: [⚫] Code for repository script [readAllProjectFiles](scripts/utils/readAllProjectFiles.ts) should never be published in any package
// TODO: Use fs/promises instead of fs
