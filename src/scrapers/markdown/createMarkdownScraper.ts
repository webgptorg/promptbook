import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import { keepTypeImported } from '../../utils/organization/keepImported';
import type { ScraperConstructor } from '../_common/register/ScraperConstructor';
import { MarkdownScraper } from './MarkdownScraper';
import { markdownScraperMetadata } from './register-metadata';

keepTypeImported<ScraperConstructor>();

/**
 * @@@
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export const createMarkdownScraper = Object.assign(
    (tools: Pick<ExecutionTools, 'llm'>, options: PrepareAndScrapeOptions): MarkdownScraper => {
        return new MarkdownScraper(tools, options);
    },
    markdownScraperMetadata,
) satisfies ScraperConstructor; /* <- Note: [🤛] */

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
