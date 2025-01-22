import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import { keepTypeImported } from '../../utils/organization/keepTypeImported';
import type { ScraperConstructor } from '../_common/register/ScraperConstructor';
import { MarkitdownScraper } from './MarkitdownScraper';
import { markitdownScraperMetadata } from './register-metadata';

keepTypeImported<ScraperConstructor>();

/**
 * Constructor of `MarkitdownScraper`
 *
 * @public exported from `@promptbook/markitdown`
 */
export const createMarkitdownScraper = Object.assign(
    (tools: Pick<ExecutionTools, 'llm'>, options: PrepareAndScrapeOptions): MarkitdownScraper => {
        return new MarkitdownScraper(tools, options);
    },
    markitdownScraperMetadata,
) satisfies ScraperConstructor; /* <- Note: [🤛] */

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
