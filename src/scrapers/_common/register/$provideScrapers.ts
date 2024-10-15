import { $isRunningInBrowser, $isRunningInWebWorker } from '../../../_packages/utils.index';
import { UnexpectedError } from '../../../errors/UnexpectedError';
import { PrepareAndScrapeOptions } from '../../../prepare/PrepareAndScrapeOptions';
import { string_mime_type } from '../../../types/typeAliases';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import { Scraper } from '../Scraper';
import { $provideScrapersForBrowser } from './$provideScrapersForBrowser';
import { $provideScrapersForNode } from './$provideScrapersForNode';

export type ProvideScrapersOptions = PrepareAndScrapeOptions & {
    /**
     * @@@
     *
     * TODO: [🦔]
     */
    mimeType?: string_mime_type;

    /**
     * @@@
     */
    isAutoInstalled?: boolean;
};

/**
 * Returns LLM tools for CLI
 *
 * @private within the repository - for CLI utils
 */
export async function $provideScrapers(options: ProvideScrapersOptions): Promise<Array<Scraper>> {
    if ($isRunningInNode()) {
        return /* not await */ $provideScrapersForNode(options);
    } else if ($isRunningInBrowser() || $isRunningInWebWorker()) {
        return /* not await */ $provideScrapersForBrowser(options);
    } else {
        throw new UnexpectedError('Unknown runtime environment');
    }
}
