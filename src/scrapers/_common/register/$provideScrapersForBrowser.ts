import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import type { PrepareAndScrapeOptions } from '../../../prepare/PrepareAndScrapeOptions';
import { $isRunningInBrowser } from '../../../utils/environment/$isRunningInBrowser';
import { $isRunningInWebWorker } from '../../../utils/environment/$isRunningInWebWorker';
import type { Scraper } from '../Scraper';

/**
 * @@@!!!!!!
 *
 * 1) @@@
 * 2) @@@
 *
 * @public exported from `@promptbook/core`
 */
export async function $provideScrapersForBrowser(options: PrepareAndScrapeOptions): Promise<Array<Scraper>> {
    if (!$isRunningInBrowser() || $isRunningInWebWorker()) {
        throw new EnvironmentMismatchError('Function `$provideScrapersForBrowser` works only in browser environment');
    }

    const { isAutoInstalled /* Note: [0] Intentionally not assigning a default value = IS_AUTO_INSTALLED */ } = options;

    if (
        isAutoInstalled === true /* <- Note: [0] Ignoring undefined, just checking EXPLICIT requirement for install */
    ) {
        throw new EnvironmentMismatchError('Auto-installing is not supported in browser environment');
    }

    return [
        // TODO: !!!!!! Implement
    ];
}
