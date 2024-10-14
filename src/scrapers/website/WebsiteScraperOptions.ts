import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import type { MarkdownScraper } from '../markdown/MarkdownScraper';

/**
 * Options for WebsiteScraper
 */
export type WebsiteScraperOptions = PrepareAndScrapeOptions /*
                                      <- TODO: [🍇] Do not need all things from `PrepareAndScrapeOptions`,
                                              `Pick` just used in scraper
*/ & {
    /**
     * Markdown scraper used internally
     */
    readonly markdownScraper: MarkdownScraper;
};
