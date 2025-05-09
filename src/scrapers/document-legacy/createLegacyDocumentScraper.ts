import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import { keepTypeImported } from '../../utils/organization/keepTypeImported';
import type { ScraperConstructor } from '../_common/register/ScraperConstructor';
import { LegacyDocumentScraper } from './LegacyDocumentScraper';
import { legacyDocumentScraperMetadata } from './register-metadata';

keepTypeImported<ScraperConstructor>();

/**
 * Creates a scraper for legacy document formats (.doc, .rtf, etc).
 * Uses LibreOffice for conversion to extract content from older document formats.
 *
 * @public exported from `@promptbook/legacy-documents`
 */
export const createLegacyDocumentScraper = Object.assign(
    (tools: Pick<ExecutionTools, 'llm'>, options: PrepareAndScrapeOptions): LegacyDocumentScraper => {
        return new LegacyDocumentScraper(tools, options);
    },
    legacyDocumentScraperMetadata,
) satisfies ScraperConstructor; /* <- Note: [🤛] */

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
