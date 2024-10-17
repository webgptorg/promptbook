import { readdir } from 'fs/promises';
import { join } from 'path';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import type { string_dirname } from '../../types/typeAliases';
import type { string_filename } from '../../types/typeAliases';
import { $isRunningInNode } from '../environment/$isRunningInNode';
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
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError('Function `$listAllFiles` works only in Node environment.js');
    }

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
 * TODO: [😶] Unite floder listing
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 * TODO: [🖇] What about symlinks?
 */
