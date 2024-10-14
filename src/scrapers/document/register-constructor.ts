import { Registration } from '../../utils/$Register';
import { $scrapersRegister } from '../_common/register/$scrapersRegister';
import { createDocumentScraper } from './createDocumentScraper';

/**
 * Registration of known scraper
 *
 * Warning: This is not useful for the end user, it is just a side effect of the mechanism that handles all available known scrapers
 *
 * @public exported from `@promptbook/documents`
 * @public exported from `@promptbook/cli`
 */
export const _DocumentScraperRegistration: Registration = $scrapersRegister.register(createDocumentScraper);

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
