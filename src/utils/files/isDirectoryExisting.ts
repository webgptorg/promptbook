import type { FilesystemTools } from '../../execution/FilesystemTools';
import type { string_dirname } from '../../types/typeAliases';

/**
 * Checks if the directory exists
 *
 * @private within the repository
 */
export async function isDirectoryExisting(directoryPath: string_dirname, fs: FilesystemTools): Promise<boolean> {
    const isReadAccessAllowed = await fs
        .access(directoryPath, fs.constants.R_OK)
        .then(() => true)
        .catch(() => false);

    if (!isReadAccessAllowed) {
        return false;
    }

    const isDirectory = await fs
        .stat(directoryPath)
        .then((fileStat) => fileStat.isDirectory())
        .catch(() => false);

    return isDirectory;
}

/**
 * Note: Not [~🟢~] because it is not directly dependent on `fs
 * TODO: [🐠] This can be a validator - with variants that return true/false and variants that throw errors with meaningless messages
 * TODO: [🧠][📂] "directory" vs "folder"
 * TODO: [🖇] What about symlinks?
 */
