import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import { keepTypeImported } from '../../utils/organization/keepTypeImported';
import type { ScraperConstructor } from '../_common/register/ScraperConstructor';
import { BoilerplateScraper } from './BoilerplateScraper';
import { boilerplateScraperMetadata } from './register-metadata';

keepTypeImported<ScraperConstructor>();

/**
 * Constructor of `BoilerplateScraper`
 *
 * @public exported from `@promptbook/boilerplate`
 */
export const createBoilerplateScraper = Object.assign(
    (tools: Pick<ExecutionTools, 'llm'>, options: PrepareAndScrapeOptions): BoilerplateScraper => {
        return new BoilerplateScraper(tools, options);
    },
    boilerplateScraperMetadata,
) satisfies ScraperConstructor; /* <- Note: [🤛] */

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
