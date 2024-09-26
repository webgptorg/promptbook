import { legacyDocumentScraper } from './document-legacy/legacyDocumentScraper';
import { documentScraper } from './document/documentScraper';
import { markdownScraper } from './markdown/markdownScraper';

/**
 * @@@
 *
 * @public exported from `@promptbook/core`
 */
export const SCRAPERS = [
    markdownScraper,
    documentScraper,
    legacyDocumentScraper,
    // <- Note: [♓️] This is the order of the scrapers for knowledge, BUT consider some better (more explicit) way to do this
] as const;
