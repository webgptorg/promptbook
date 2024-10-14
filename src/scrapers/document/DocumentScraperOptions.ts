import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import { string_executable_path } from '../../types/typeAliases';
import type { MarkdownScraper } from '../markdown/MarkdownScraper';

/**
 * Options for DocumentScraper
 */
export type DocumentScraperOptions = PrepareAndScrapeOptions /*
                                      <- TODO: [🍇] Do not need all things from `PrepareAndScrapeOptions`,
                                               `Pick` just used in scraper
*/ & {
    /**
     * Markdown scraper used internally
     */
    readonly markdownScraper: MarkdownScraper;

    /**
     * Path to the `pandoc` executable
     *
     * @example 'C:/Users/me/AppData/Local/Pandoc/pandoc.exe'
     */
    readonly pandocPath?: string_executable_path;
};
