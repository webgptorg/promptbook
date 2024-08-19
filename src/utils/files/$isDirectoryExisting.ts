import { access, constants, stat } from 'fs/promises';
import type { string_folder_path } from '../../types/typeAliases';

/**
 * Checks if the directory exists
 *
 * Note: `$` is used to indicate that this function is not a pure function - it looks at the filesystem
 *
 * @private within the repository
 */
export async function $isDirectoryExisting(directoryPath: string_folder_path): Promise<boolean> {
    const isReadAccessAllowed = await access(directoryPath, constants.R_OK)
        .then(() => true)
        .catch(() => false);

    if (!isReadAccessAllowed) {
        return false;
    }

    const isDirectory = await stat(directoryPath)
        .then((fileStat) => fileStat.isDirectory())
        .catch(() => false);

    return isDirectory;
}

/**
 * Note: [🟢] This code should never be published outside of `@promptbook/node` and `@promptbook/cli` and `@promptbook/cli`
 * TODO: [🐠] This can be a validator - with variants that return true/false and variants that throw errors with meaningless messages
 * TODO: [🧠][📂] "directory" vs "folder"
 * TODO: [🖇] What about symlinks?
 */
