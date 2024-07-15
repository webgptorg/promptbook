import { isRunningInNode } from '../../utils/isRunningInWhatever';
import { just } from '../../utils/just';

/**
 * Just testing imports and compatibility
 */
export async function justTestFsImport() {
    if (!isRunningInNode()) {
        throw new Error(
            'Function `testFiles` can only be run in Node.js environment because it reads the file system.',
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const files = await require(just('glob-promise'))('/**/*');
    console.info('testFiles', { files });
}


/**
 * TODO: !!! Remove this file
 */