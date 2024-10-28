import { DEFAULT_IS_AUTO_INSTALLED, DEFAULT_IS_VERBOSE } from '../config';
import { EnvironmentMismatchError } from '../errors/EnvironmentMismatchError';
import type { Executables } from '../execution/Executables';
import type { PrepareAndScrapeOptions } from '../prepare/PrepareAndScrapeOptions';
import { $isRunningInNode } from '../utils/environment/$isRunningInNode';
import { TODO_USE } from '../utils/organization/TODO_USE';

/**
 * @@@
 *
 * @public exported from `@promptbook/node`
 */
export async function $provideExecutablesForNode(options?: PrepareAndScrapeOptions): Promise<Executables> {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError('Function `$getScrapersForNode` works only in Node.js environment');
    }

    const { isAutoInstalled = DEFAULT_IS_AUTO_INSTALLED, isVerbose = DEFAULT_IS_VERBOSE } = options || {};

    TODO_USE(isAutoInstalled);
    TODO_USE(isVerbose);

    return {
        // TODO: !!!!!! use `locate-app` library here
        pandocPath: 'C:/Users/me/AppData/Local/Pandoc/pandoc.exe',
        libreOfficePath: 'C:/Program Files/LibreOffice/program/swriter.exe',
    };
}

/**
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
