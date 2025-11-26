import glob from 'glob-promise'; // <- TODO: [🚰] Use just 'glob'
import { join } from 'path';

/**
 * Finds and returns all TypeScript source files in the project
 * to be processed during build, documentation generation, or analysis
 */
export async function findAllProjectFiles(): Promise<ReadonlyArray<string>> {
    const srcFiles = await glob(join(__dirname, '../../src/**/*.{ts,tsx}').split('\\').join('/'));
    const serversConfigurationFile = join(__dirname, '../../servers.ts');

    return [...srcFiles, serversConfigurationFile];
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
