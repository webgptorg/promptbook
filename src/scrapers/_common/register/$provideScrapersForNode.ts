import { IS_AUTO_INSTALLED, IS_VERBOSE } from '../../../config';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import type { PrepareAndScrapeOptions } from '../../../prepare/PrepareAndScrapeOptions';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import { TODO_USE } from '../../../utils/organization/TODO_USE';
import type { Scraper } from '../Scraper';

/**
 * !!!!!!
 *
 * @public exported from `@promptbook/node`
 */
export async function $provideScrapersForNode(options?: PrepareAndScrapeOptions): Promise<Array<Scraper>> {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError('Function `$getScrapersForNode` works only in Node.js environment');
    }

    const { isAutoInstalled = IS_AUTO_INSTALLED, isVerbose = IS_VERBOSE } = options || {};

    TODO_USE(isAutoInstalled);
    TODO_USE(isVerbose);

    /*
    for (const scraper of $scrapersMetadataRegister.list()) {

    }
        */

    return [];
}

/**
 * Note: [🟡 <- TODO: !!!!!! Included in $provideScrapers] Code in this file should never be published outside of `@promptbook/cli`
 */
