import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import type { ScraperConstructor } from '../_common/register/ScraperConstructor';
import { DocumentScraper } from './DocumentScraper';
import { documentScraperMetadata } from './register-metadata';

/**
 * @@@
 *
 * @public exported from `@promptbook/documents`
 */
export const createDocumentScraper = Object.assign(
    (tools: Pick<ExecutionTools, 'llm'>, options: PrepareAndScrapeOptions): DocumentScraper => {
        return new DocumentScraper(tools, options);
    },
    documentScraperMetadata,
) satisfies ScraperConstructor; /* <- TODO: [🤛] */

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
