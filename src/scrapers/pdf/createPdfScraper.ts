import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import { ScraperConstructor } from '../_common/register/ScraperConstructor';
import { PdfScraper } from './PdfScraper';
import { pdfScraperMetadata } from './register-metadata';

/**
 * @@@
 *
 * @public exported from `@promptbook/pdf`
 */
export const createPdfScraper = Object.assign(
    (tools: Pick<ExecutionTools, 'llm'>, options: PrepareAndScrapeOptions): PdfScraper => {
        return new PdfScraper(tools, options);
    },
    pdfScraperMetadata,
) satisfies ScraperConstructor; /* <- TODO: [🤛] */

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
