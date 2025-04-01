import { join } from 'path';
import { LOOP_LIMIT } from '../../../config';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import { $provideFilesystemForNode } from '../../../scrapers/_common/register/$provideFilesystemForNode';
import type { string_filename } from '../../../types/typeAliases';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import { isFileExisting } from '../../../utils/files/isFileExisting';
import { isRootPath } from '../../../utils/validators/filePath/isRootPath';
import { $setUsedEnvFilename } from './$registeredLlmToolsMessage';

/**
 * Provides the path to the `.env` file
 *
 * Note: `$` is used to indicate that this function is not a pure function - it uses filesystem to access .env file
 *
 * @private within the repository - for CLI utils
 */
export async function $provideEnvFilepath(): Promise<string_filename | null> {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError('Function `$provideEnvFilepath` works only in Node.js environment');
    }

    const envFilePatterns = [
        '.env',
        '.env.test',
        '.env.local',
        '.env.development.local',
        '.env.development',

        '.env.production.local',
        '.env.production',
        '.env.prod.local',
        '.env.prod',

        // <- TODO: Maybe add more patterns
    ];

    let rootDirname = process.cwd();

    up_to_root: for (let i = 0; i < LOOP_LIMIT; i++) {
        for (const pattern of envFilePatterns) {
            const envFilename = join(rootDirname, pattern);

            if (await isFileExisting(envFilename, $provideFilesystemForNode())) {
                $setUsedEnvFilename(envFilename);
                return envFilename;
                break up_to_root;
            }
        }

        if (isRootPath(rootDirname)) {
            break up_to_root;
        }

        // Note: If the directory does not exist, try the parent directory
        rootDirname = join(rootDirname, '..');
    }

    return null;
}

/**
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
