import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import type { DocumentScraper } from '../document/DocumentScraper';

/**
 * Options for LegacyDocumentScraper
 */
export type LegacyDocumentScraperOptions = PrepareAndScrapeOptions & {
    /**
     * Markdown scraper used internally
     */
    documentScraper: DocumentScraper;
};
