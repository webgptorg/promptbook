import { access, constants, readdir, readFile, stat } from 'fs/promises';
import { $isRunningInNode } from '../../../_packages/utils.index';
import { IS_VERBOSE } from '../../../config';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import { FilesystemTools } from '../../../execution/FilesystemTools';
import { PrepareAndScrapeOptions } from '../../../prepare/PrepareAndScrapeOptions';
import { TODO_USE } from '../../../utils/organization/TODO_USE';

/**
 * @@@
 *
 * @public exported from `@promptbook/node`
 */
export function $provideFilesystemForNode(options?: Pick<PrepareAndScrapeOptions, 'isVerbose'>): FilesystemTools {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError('Function `$provideFilesystemForNode` works only in Node.js environment');
    }

    const { isVerbose = IS_VERBOSE } = options || {};

    TODO_USE(isVerbose);

    return {
        stat,
        access,
        constants,
        readFile,
        readdir,
    };
}

/**
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
