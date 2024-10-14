import { Registration } from '../../utils/$Register';
import { $scrapersRegister } from '../_common/register/$scrapersRegister';
import { createXxxxScraper } from './createXxxxScraper';

/**
 * Registration of known scraper
 *
 * Warning: This is not useful for the end user, it is just a side effect of the mechanism that handles all available known scrapers
 *
 * @public exported from `@promptbook/xxxx`
 * @public exported from `@promptbook/cli`
 */
export const _XxxxScraperRegistration: Registration = $scrapersRegister.register(createXxxxScraper);

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
