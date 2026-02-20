import type { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import type { ScraperSourceHandler } from '../../_common/Scraper';
import { $provideFilesystemForNode } from '../../_common/register/$provideFilesystemForNode';
import { WebsiteScraper } from '../WebsiteScraper';

/**
 * Input options for `scrapeWebsiteContentToMarkdown`.
 *
 * @private internal utility of website scraping
 */
type ScrapeWebsiteContentToMarkdownOptions = {
    readonly url: string;
    readonly html: string;
    readonly isVerbose?: boolean;
};

/**
 * Converts a single website HTML payload to markdown using `WebsiteScraper`.
 *
 * This performs a shallow scrape for one URL and does not crawl linked pages.
 *
 * @private internal utility of website scraping
 */
export async function scrapeWebsiteContentToMarkdown(options: ScrapeWebsiteContentToMarkdownOptions): Promise<string> {
    const { url, html, isVerbose = false } = options;
    const sourceHandler: ScraperSourceHandler = {
        source: url as ScraperSourceHandler['source'],
        filename: null,
        url: url as ScraperSourceHandler['url'],
        mimeType: 'text/html',
        asText: () => html,
        asJson: () => {
            throw new Error('JSON conversion not supported for HTML content');
        },
    };
    const scraper = new WebsiteScraper(
        {
            fs: $provideFilesystemForNode({ isVerbose }),
            llm: undefined as LlmExecutionTools | undefined,
        },
        {
            isVerbose,
            intermediateFilesStrategy: 'HIDE_AND_CLEAN',
        },
    );

    const intermediateSource = await scraper.$convert(sourceHandler);

    try {
        return intermediateSource.markdown;
    } finally {
        await intermediateSource.destroy();
    }
}

/**
 * Note: [🟢] Code in this file should never be published in packages that could be imported into browser environment
 */
