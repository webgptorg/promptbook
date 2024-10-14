import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import type { MarkdownScraper } from '../markdown/MarkdownScraper';

/**
 * Options for DocumentScraper
 */
export type DocumentScraperOptions = PrepareAndScrapeOptions & {
    /**
     * Markdown scraper used internally
     */
    markdownScraper: MarkdownScraper;
};
