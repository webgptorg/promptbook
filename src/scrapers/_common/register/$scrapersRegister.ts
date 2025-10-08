import { $Register } from '../../../utils/misc/$Register';
import type { ScraperConstructor } from './ScraperConstructor';

/**
 * Registry for all available scrapers in the system.
 * Central point for registering and accessing different types of content scrapers.
 *
 * Note: `$` is used to indicate that this interacts with the global scope
 * @singleton Only one instance of each register is created per build, but there can be more than one in different build modules
 * @public exported from `@promptbook/core`
 */
export const $scrapersRegister = new $Register<ScraperConstructor>('scraper_constructors');

/**
 * TODO: [®] DRY Register logic
 */
