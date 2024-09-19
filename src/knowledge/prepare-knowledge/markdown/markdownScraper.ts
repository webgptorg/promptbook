import type { KnowledgePiecePreparedJson } from '../../../_packages/types.index';
import { TODO_USE } from '../../../utils/organization/TODO_USE';
import type { AbstractScraper, ScraperSourceOptions } from '../_common/AbstractScraper';
import simpleSample from './samples/10-simple.md'; // <- TODO: !!!!!! Is this working, if not make it via URL

/**
 * Scraper for markdown files
 *
 * @see `documentationUrl` for more details
 * @public exported from `@promptbook/core`
 */
export const markdownScraper = {
    /**
     * Mime types that this scraper can handle
     */
    mimeTypes: ['text/markdown'],

    /**
     * Link to documentation
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/@@',

    /**
     * Examples what this scraper can scrape
     */
    examples: [simpleSample],

    /**
     * Scrapes the markdown file and returns the knowledge pieces or `null` if it can't scrape it
     */
    async scrape(source: ScraperSourceOptions): Promise<Array<KnowledgePiecePreparedJson> | null> {
        TODO_USE(source);
        return null;
    },
} as const satisfies AbstractScraper;

/**
 * TODO: [🦖] Make some system for putting scrapers to separete packages
 * TODO: !!!!!!  Same pattern for commands> as const satisfies AbstractScraper
 */
