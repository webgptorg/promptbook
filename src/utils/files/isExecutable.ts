import type { FilesystemTools } from '../../execution/FilesystemTools';

/**
 * Checks if the file is executable
 *
 * @private within the repository
 */
export async function isExecutable(path: string, fs: FilesystemTools): Promise<boolean> {
    try {
        await fs.access(path, fs.constants.X_OK);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Note: Not [~🟢~] because it is not directly dependent on `fs
 * TODO: [🖇] What about symlinks?
 */
