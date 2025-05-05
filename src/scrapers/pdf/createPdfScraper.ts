import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import { keepTypeImported } from '../../utils/organization/keepTypeImported';
import type { ScraperConstructor } from '../_common/register/ScraperConstructor';
import { PdfScraper } from './PdfScraper';
import { pdfScraperMetadata } from './register-metadata';

keepTypeImported<ScraperConstructor>();

/**
 * Factory function to create an instance of PdfScraper.
 * It bundles the scraper class with its metadata.
 *
 * @public exported from `@promptbook/pdf`
 */
export const createPdfScraper = Object.assign(
    (tools: Pick<ExecutionTools, 'llm'>, options: PrepareAndScrapeOptions): PdfScraper => {
        return new PdfScraper(tools, options);
    },
    pdfScraperMetadata,
) satisfies ScraperConstructor; /* <- Note: [🤛] */

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
