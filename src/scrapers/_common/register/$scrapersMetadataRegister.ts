import { $Register } from '../../../utils/misc/$Register';
import type { ScraperAndConverterMetadata } from './ScraperAndConverterMetadata';

/**
 * Global registry for storing metadata about all available scrapers and converters.
 *
 * Note: `$` is used to indicate that this interacts with the global scope.
 * @singleton Only one instance of each register is created per build, but there can be more in different contexts (e.g., tests).
 * @public exported from `@promptbook/core`
 */
export const $scrapersMetadataRegister = new $Register<ScraperAndConverterMetadata>('scrapers_metadata');

/**
 * TODO: [®] DRY Register logic
 */
