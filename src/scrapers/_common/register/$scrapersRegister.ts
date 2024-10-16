import { $Register } from '../../../utils/$Register';
import type { ScraperConstructor } from '../ScraperConstructor';

/**
 * @@@
 *
 * Note: `$` is used to indicate that this interacts with the global scope
 * @singleton Only one instance of each register is created per build, but thare can be more @@@
 * @public exported from `@promptbook/core`
 */
export const $scrapersRegister = new $Register<ScraperConstructor>('scraper_constructors');

/**
 * TODO: [®] DRY Register logic
 */
