import glob from 'glob-promise';
import { join } from 'node:path';

/**
 * @@@
 */
export async function findAllProjectFiles(): Promise<ReadonlyArray<string>> {
    return await glob(join(__dirname, '../../src/**/*.{ts,tsx}').split('\\').join('/'));
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
