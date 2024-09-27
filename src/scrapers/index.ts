import { legacyDocumentScraper } from './document-legacy/legacyDocumentScraper';
import { documentScraper } from './document/documentScraper';
import { markdownScraper } from './markdown/markdownScraper';
import { pdfScraper } from './pdf/pdfScraper';
import { websiteScraper } from './website/websiteScraper';

/**
 * @@@
 *
 * @public exported from `@promptbook/core`
 */
export const SCRAPERS = [
    markdownScraper,
    documentScraper,
    legacyDocumentScraper,
    pdfScraper,
    websiteScraper,
    // <- Note: [♓️] This is the order of the scrapers for knowledge, BUT consider some better (more explicit) way to do this
] as const;
