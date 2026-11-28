import { stat } from 'fs/promises';
import { join } from 'path';

/**
 * Returns true when one folder contains the Next Agents Server app marker files.
 *
 * @private internal utility of `buildAgentsServer`
 */
export async function isAgentsServerAppPath(candidate: string): Promise<boolean> {
    try {
        const [packageStats, nextConfigStats] = await Promise.all([
            stat(join(candidate, 'package.json')),
            stat(join(candidate, 'next.config.ts')),
        ]);

        return packageStats.isFile() && nextConfigStats.isFile();
    } catch {
        return false;
    }
}
