import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import { keepTypeImported } from '../../utils/organization/keepTypeImported';
import type { ScraperConstructor } from '../_common/register/ScraperConstructor';
import { DocumentScraper } from './DocumentScraper';
import { documentScraperMetadata } from './register-metadata';

keepTypeImported<ScraperConstructor>();

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
) satisfies ScraperConstructor; /* <- Note: [🤛] */

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
