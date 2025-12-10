import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import { keepTypeImported } from '../../utils/organization/keepTypeImported';
import type { ScraperConstructor } from '../_common/register/ScraperConstructor';
import { websiteScraperMetadata } from './register-metadata';
import { WebsiteScraper } from './WebsiteScraper';

keepTypeImported<ScraperConstructor>();

/**
 * Factory function to create an instance of WebsiteScraper.
 * It bundles the scraper class with its metadata.
 *
 * @public exported from `@promptbook/website-crawler`
 */
export const createWebsiteScraper = Object.assign(
    (tools: Pick<ExecutionTools, 'llm'>, options: PrepareAndScrapeOptions): WebsiteScraper => {
        return new WebsiteScraper(tools, options);
    },
    websiteScraperMetadata,
) satisfies ScraperConstructor; /* <- Note: [🤛] */

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
