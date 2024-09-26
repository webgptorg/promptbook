import type { ArrayElement } from 'type-fest/source/internal';
import type { SCRAPERS } from '..'; // <- TODO: !!!!!! Is this preserved after auto-import?

/**
 * @@@
 *
 * @private still an internal experimental
 */
export type Scraper = ArrayElement<typeof SCRAPERS>;
