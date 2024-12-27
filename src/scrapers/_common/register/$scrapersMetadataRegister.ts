import { $Register } from '../../../utils/$Register';
import type { ScraperAndConverterMetadata } from './ScraperAndConverterMetadata';

/**
 * @@@
 *
 * Note: `$` is used to indicate that this interacts with the global scope
 * @singleton Only one instance of each register is created per build, but thare can be more @@@
 * @public exported from `@promptbook/core`
 */
export const $scrapersMetadataRegister = new $Register<ScraperAndConverterMetadata>('scrapers_metadata');

/**
 * TODO: [®] DRY Register logic
 */
