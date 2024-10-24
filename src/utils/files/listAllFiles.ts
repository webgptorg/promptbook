import { join } from 'path';
import type { FilesystemTools } from '../../execution/FilesystemTools';
import type { string_dirname } from '../../types/typeAliases';
import type { string_filename } from '../../types/typeAliases';
import { isDirectoryExisting } from './isDirectoryExisting';

/**
 * Reads all files in the directory
 *
 * @param path
 * @param isRecursive
 * @returns List of all files in the directory
 * @private internal function of `createCollectionFromDirectory`
 */
export async function listAllFiles(
    path: string_dirname,
    isRecursive: boolean,
    fs: FilesystemTools,
): Promise<Array<string_filename>> {
    if (!(await isDirectoryExisting(path, fs))) {
        throw new Error(`Directory "${path}" does not exist or is not readable`);
        //           <- TODO: Use some custom error class
    }

    const dirents = await fs.readdir(path, {
        withFileTypes: true /* Note: This is not working: recursive: isRecursive */,
    });

    const fileNames = dirents
        .filter((dirent) => dirent.isFile())
        .map(({ name }) => join(path, name).split('\\').join('/'));

    if (isRecursive) {
        for (const dirent of dirents.filter((dirent) => dirent.isDirectory())) {
            const subPath = join(path, dirent.name);
            fileNames.push(...(await listAllFiles(subPath, isRecursive, fs)).map((filename) => filename));
        }
    }

    return fileNames;
}

/**
 * TODO: [😶] Unite floder listing
 * Note: Not [~🟢~] because it is not directly dependent on `fs
 * TODO: [🖇] What about symlinks?
 */
