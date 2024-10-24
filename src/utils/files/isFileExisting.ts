import type { FilesystemTools } from '../../execution/FilesystemTools';
import type { string_filename } from '../../types/typeAliases';

/**
 * Checks if the file exists
 *
 * @private within the repository
 */
export async function isFileExisting(filename: string_filename, fs: FilesystemTools): Promise<boolean> {
    const isReadAccessAllowed = await fs
        .access(filename, fs.constants.R_OK)
        .then(() => true)
        .catch(() => false);

    if (!isReadAccessAllowed) {
        return false;
    }

    const isFile = await fs
        .stat(filename)
        .then((fileStat) => fileStat.isFile())
        .catch(() => false);

    return isFile;
}

/**
 * Note: Not [~🟢~] because it is not directly dependent on `fs
 * TODO: [🐠] This can be a validator - with variants that return true/false and variants that throw errors with meaningless messages
 * TODO: [🖇] What about symlinks?
 */
