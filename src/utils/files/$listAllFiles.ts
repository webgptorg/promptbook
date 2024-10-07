import { readdir } from 'fs/promises';
import { join } from 'path';
import type { string_dirname } from '../../types/typeAliases';
import type { string_filename } from '../../types/typeAliases';
import { $isDirectoryExisting } from './$isDirectoryExisting';

/**
 * Reads all files in the directory
 *
 * Note: `$` is used to indicate that this function is not a pure function - it looks at the filesystem
 *
 * @param path
 * @param isRecursive
 * @returns List of all files in the directory
 * @private internal function of `createCollectionFromDirectory`
 */
export async function $listAllFiles(path: string_dirname, isRecursive: boolean): Promise<Array<string_filename>> {
    if (!(await $isDirectoryExisting(path))) {
        throw new Error(`Directory "${path}" does not exist or is not readable`);
        //           <- TODO: Use some custom error class
    }

    const dirents = await readdir(path, {
        withFileTypes: true /* Note: This is not working: recursive: isRecursive */,
    });

    const fileNames = dirents
        .filter((dirent) => dirent.isFile())
        .map(({ name }) => join(path, name).split('\\').join('/'));

    if (isRecursive) {
        for (const dirent of dirents.filter((dirent) => dirent.isDirectory())) {
            const subPath = join(path, dirent.name);
            fileNames.push(...(await $listAllFiles(subPath, isRecursive)).map((filename) => filename));
        }
    }

    return fileNames;
}

/**
 * Note: [🟢] Code in this file should never be published outside of `@promptbook/node` and `@promptbook/cli`
 * TODO: [🖇] What about symlinks?
 */
