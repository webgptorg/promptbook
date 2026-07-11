import { stat } from 'fs/promises';

/**
 * Returns true when one path exists as a regular file.
 *
 * @private internal utility of `buildAgentsServer`
 */
export async function isFile(path: string): Promise<boolean> {
    try {
        return (await stat(path)).isFile();
    } catch {
        return false;
    }
}
