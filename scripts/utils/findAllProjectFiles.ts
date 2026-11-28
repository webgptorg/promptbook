import glob from 'glob-promise';
import { join } from 'path';

/**
 * @@@
 */
export async function findAllProjectFiles(): Promise<ReadonlyArray<string>> {
    const srcFiles = await glob(join(__dirname, '../../src/**/*.{ts,tsx}').split('\\').join('/'));
    const serversConfigurationFile = join(__dirname, '../../servers.ts');

    return [...srcFiles, serversConfigurationFile];
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
