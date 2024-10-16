import { ExecutionTools, PrepareAndScrapeOptions, Scraper } from '../../../_packages/types.index';
import { Registered } from '../../../utils/$Register';

/**
 * @@@
 */
export type ScraperConstructor = Registered &
    ((tools: Pick<ExecutionTools, 'llm'>, options: PrepareAndScrapeOptions) => Scraper);

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
