import { access, constants, mkdir, readdir, readFile, stat, watch, writeFile } from 'fs/promises';
import { DEFAULT_IS_VERBOSE } from '../../../config';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import type { FilesystemTools } from '../../../execution/FilesystemTools';
import type { PrepareAndScrapeOptions } from '../../../prepare/PrepareAndScrapeOptions';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import { TODO_USE } from '../../../utils/organization/TODO_USE';

/**
 * Provides filesystem access (for example for Node.js-based scrapers)
 * Creates a standardized filesystem interface that scrapers can use for file operations.
 *
 * @public exported from `@promptbook/node`
 */
export function $provideFilesystemForNode(options?: Pick<PrepareAndScrapeOptions, 'isVerbose'>): FilesystemTools {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError('Function `$provideFilesystemForNode` works only in Node.js environment');
    }

    const { isVerbose = DEFAULT_IS_VERBOSE } = options || {};

    TODO_USE(isVerbose);

    return {
        stat,
        access,
        constants,
        readFile,
        writeFile,
        readdir,
        mkdir,
        watch,
    };
}

/**
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 * TODO: [🏓] Unite `xxxForServer` and `xxxForNode` naming
 */
