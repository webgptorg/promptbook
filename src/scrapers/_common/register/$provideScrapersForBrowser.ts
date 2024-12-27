import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import type { ExecutionTools } from '../../../execution/ExecutionTools';
import type { PrepareAndScrapeOptions } from '../../../prepare/PrepareAndScrapeOptions';
import { $isRunningInBrowser } from '../../../utils/environment/$isRunningInBrowser';
import { $isRunningInWebWorker } from '../../../utils/environment/$isRunningInWebWorker';
import type { Scraper } from '../Scraper';
import { $scrapersRegister } from './$scrapersRegister';

/**
 * @@@
 *
 * 1) @@@
 * 2) @@@
 *
 * @public exported from `@promptbook/browser`
 */
export async function $provideScrapersForBrowser(
    tools: Pick<ExecutionTools, 'llm'>,
    options?: PrepareAndScrapeOptions,
): Promise<ReadonlyArray<Scraper>> {
    if (!$isRunningInBrowser() || $isRunningInWebWorker()) {
        throw new EnvironmentMismatchError('Function `$provideScrapersForBrowser` works only in browser environment');
    }

    const { isAutoInstalled /* Note: [0] Intentionally not assigning a default value = IS_AUTO_INSTALLED */ } =
        options || {};

    if (
        isAutoInstalled === true /* <- Note: [0] Ignoring undefined, just checking EXPLICIT requirement for install */
    ) {
        throw new EnvironmentMismatchError('Auto-installing is not supported in browser environment');
    }

    const scrapers: Array<Scraper> = [];
    for (const scraperFactory of $scrapersRegister.list()) {
        const scraper = await scraperFactory(tools, options || {});
        scrapers.push(scraper);
    }

    return scrapers;
}
