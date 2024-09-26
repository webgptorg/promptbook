import { docxScraper } from './docx/docxScraper';
import { markdownScraper } from './markdown/markdownScraper';

/**
 * @@@
 *
 * @public exported from `@promptbook/core`
 */
export const SCRAPERS = [
    markdownScraper,
    docxScraper,
    // <- Note: [♓️] This is the order of the scrapers for knowledge, BUT consider some better (more explicit) way to do this
] as const;
