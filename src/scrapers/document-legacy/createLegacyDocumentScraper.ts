import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import { ScraperConstructor } from '../_common/register/ScraperConstructor';
import { LegacyDocumentScraper } from './LegacyDocumentScraper';
import { legacyDocumentScraperMetadata } from './register-metadata';

/**
 * @@@
 *
 * @public exported from `@promptbook/legacy-documents`
 */
export const createLegacyDocumentScraper = Object.assign(
    (tools: Pick<ExecutionTools, 'llm'>, options: PrepareAndScrapeOptions): LegacyDocumentScraper => {
        return new LegacyDocumentScraper(tools, options);
    },
    legacyDocumentScraperMetadata,
) satisfies ScraperConstructor;

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
