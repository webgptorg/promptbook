import { $isRunningInBrowser, $isRunningInWebWorker } from '../../../_packages/utils.index';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import { PrepareAndScrapeOptions } from '../../../prepare/PrepareAndScrapeOptions';
import { TODO_USE } from '../../../utils/organization/TODO_USE';
import { ExecutionTools } from '../ExecutionTools';

/**
 * @@@!!!!!!
 *
 * 1) @@@
 * 2) @@@
 *
 * @public exported from `@promptbook/core`
 */
export async function $provideExecutionToolsForBrowser(options?: PrepareAndScrapeOptions): Promise<ExecutionTools> {
    if (!$isRunningInBrowser() || $isRunningInWebWorker()) {
        throw new EnvironmentMismatchError(
            'Function `$provideExecutionToolsForBrowser` works only in browser environment',
        );
    }

    const { mimeType } = options;

    TODO_USE(mimeType);

    return [
        // TODO: !!!!!! Implement
    ];
}
