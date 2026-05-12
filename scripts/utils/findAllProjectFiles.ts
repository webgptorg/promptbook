import glob from 'glob-promise'; // <- TODO: [🚰] Use just 'glob'
import { join } from 'path';

/**
 * Options for scanning repository source files.
 */
export type FindAllProjectFilesOptions = {
    /**
     * Whether repository scripts should be included alongside the engine sources.
     */
    readonly includeScripts?: boolean;
};

/**
 * Finds and returns all TypeScript source files in the project
 * to be processed during build, documentation generation, or analysis
 */
export async function findAllProjectFiles({
    includeScripts = false,
}: FindAllProjectFilesOptions = {}): Promise<ReadonlyArray<string>> {
    const srcFiles = await glob(join(__dirname, '../../src/**/*.{ts,tsx}').split('\\').join('/'));
    const scriptFiles = includeScripts
        ? await glob(join(__dirname, '../../scripts/**/*.{ts,tsx}').split('\\').join('/'))
        : [];
    const serversConfigurationFile = join(__dirname, '../../servers.ts');

    return [...srcFiles, ...scriptFiles, serversConfigurationFile];
}

// Note: [⚫] Code for repository script [findAllProjectFiles](scripts/utils/findAllProjectFiles.ts) should never be published in any package
