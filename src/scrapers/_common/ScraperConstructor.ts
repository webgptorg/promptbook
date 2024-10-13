import { Scraper, TODO_any } from '../../_packages/types.index';
import { Registered } from '../../utils/$Register';

/**
 * @@@
 */
export type ScraperConstructor = Registered & ((options: TODO_any) => Scraper);

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
