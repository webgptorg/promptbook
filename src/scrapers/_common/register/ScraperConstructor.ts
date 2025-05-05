import type { ExecutionTools } from '../../../execution/ExecutionTools';
import type { PrepareAndScrapeOptions } from '../../../prepare/PrepareAndScrapeOptions';
import type { Registered } from '../../../utils/$Register';
import type { Scraper } from '../Scraper';
import type { ScraperAndConverterMetadata } from './ScraperAndConverterMetadata';

/**
 * Type definition for a constructor function that creates a Scraper instance.
 * Used for registering scrapers in the system to handle different content types.
 */
export type ScraperConstructor = Registered &
    ScraperAndConverterMetadata &
    ((tools: Pick<ExecutionTools, 'llm'>, options: PrepareAndScrapeOptions) => Scraper);

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
