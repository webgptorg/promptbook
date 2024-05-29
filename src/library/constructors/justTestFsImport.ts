import glob from 'glob-promise';
import { isRunningInNode } from '../../utils/isRunningInWhatever';

/**
 * Just testing imports and compatibility
 */
export async function justTestFsImport() {
    if (!isRunningInNode()) {
        throw new Error(
            'Function `testFiles` can only be run in Node.js environment because it reads the file system.',
        );
    }

    const files = await glob('/**/*');
    console.info('testFiles', { files });
}
