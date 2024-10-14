import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import { string_executable_path } from '../../types/typeAliases';
import type { DocumentScraper } from '../document/DocumentScraper';

/**
 * Options for LegacyDocumentScraper
 */
export type LegacyDocumentScraperOptions = PrepareAndScrapeOptions /*
                                            <- TODO: [🍇] Do not need all things from `PrepareAndScrapeOptions`,
                                                    `Pick` just used in scraper
*/ & {
    /**
     * Markdown scraper used internally
     */
    readonly documentScraper: DocumentScraper;

    /**
     * Path to the LibreOffice executable
     *
     * @example 'C:/Program Files/LibreOffice/program/swriter.exe'
     */
    readonly libreOfficePath?: string_executable_path;
};
