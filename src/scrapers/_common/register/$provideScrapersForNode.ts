import { IS_AUTO_INSTALLED } from '../../../config';
import { IS_VERBOSE } from '../../../config';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import type { ExecutionTools } from '../../../execution/ExecutionTools';
import type { PrepareAndScrapeOptions } from '../../../prepare/PrepareAndScrapeOptions';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import { TODO_USE } from '../../../utils/organization/TODO_USE';
import type { Scraper } from '../Scraper';
import { $scrapersRegister } from './$scrapersRegister';

/**
 * !!!!!!
 *
 * 1) @@@
 * 2) @@@
 *
 * @public exported from `@promptbook/node`
 */
export async function $provideScrapersForNode(
    tools: Pick<ExecutionTools, 'llm'>,
    options?: PrepareAndScrapeOptions,
): Promise<Array<Scraper>> {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError('Function `$getScrapersForNode` works only in Node.js environment');
    }

    const { isAutoInstalled = IS_AUTO_INSTALLED, isVerbose = IS_VERBOSE } = options || {};

    TODO_USE(isAutoInstalled);
    TODO_USE(isVerbose);

    // TODO: !!!!!! Do here auto-installation + auto-include of missing scrapers - use all from $scrapersMetadataRegister.list()
    // TODO: [🧠] What is the best strategy for auto-install - install them all?

    const scrapers: Array<Scraper> = [];
    for (const scraperFactory of $scrapersRegister.list()) {
        const scraper = await scraperFactory(tools, options || {});
        scrapers.push(scraper);
    }

    return scrapers;
}

/**
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
