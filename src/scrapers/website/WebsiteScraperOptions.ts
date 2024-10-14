import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import type { MarkdownScraper } from '../markdown/MarkdownScraper';

/**
 * Options for WebsiteScraper
 */
export type WebsiteScraperOptions = PrepareAndScrapeOptions & {
    /**
     * Markdown scraper used internally
     */
    markdownScraper: MarkdownScraper;
};
