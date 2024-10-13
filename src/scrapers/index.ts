import { $scrapersRegister } from './_common/$scrapersRegister';
import type { Scraper } from './_common/Scraper';
import { legacyDocumentScraper } from './document-legacy/legacyDocumentScraper';
import { documentScraper } from './document/documentScraper';
import { markdownScraper } from './markdown/markdownScraper';
import { pdfScraper } from './pdf/pdfScraper';
import { websiteScraper } from './website/websiteScraper';

// TODO: [🦖] !!!!!! Pass scrapers as dependency,

/**
 * @@@
 *
 * @private because this will be replaced by a system of one scraper per package [🦖]
 * TODO: [🦖] System for scrapers NOT public exported from `@promptbook/core`
 */
export const SCRAPERS: Array<Scraper> = [
    markdownScraper,
    documentScraper,
    legacyDocumentScraper,
    pdfScraper,
    websiteScraper,
    // <- Note: [♓️] This is the order of the scrapers for knowledge, BUT consider some better (more explicit) way to do this
];


$scrapersRegister.register(markdownScraper);