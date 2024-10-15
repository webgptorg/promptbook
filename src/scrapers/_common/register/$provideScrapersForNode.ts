import { IS_AUTO_INSTALLED, IS_VERBOSE } from '../../../config';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import { TODO_USE } from '../../../utils/organization/TODO_USE';
import { Scraper } from '../Scraper';
import { ProvideScrapersOptions } from './$provideScrapers';

/**
 * Returns LLM tools for CLI
 *
 * @public expor
 */
export async function $provideScrapersForNode(options: ProvideScrapersOptions): Promise<Array<Scraper>> {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError('Function `$getScrapersForNode` works only in Node.js environment');
    }

    const { mimeType, isAutoInstalled = IS_AUTO_INSTALLED, isVerbose = IS_VERBOSE } = options;

    TODO_USE(mimeType);
    TODO_USE(isAutoInstalled);
    TODO_USE(isVerbose);

    /*
    for (const scraper of $scrapersMetadataRegister.list()) {
        if (
            !scraper.mimeTypes.includes(sourceHandler.mimeType)
            // <- TODO: [🦔] Implement mime-type wildcards
        ) {
            continue;
        }
    }
        */

    return [];
}

/**
 * Note: [🟡 <- TODO: !!!!!! Included in $provideScrapers] Code in this file should never be published outside of `@promptbook/cli`
 */
