import { Registration } from '../../utils/$Register';
import { $scrapersRegister } from '../_common/register/$scrapersRegister';
import { DocumentScraper } from './DocumentScraper';

/**
 * Registration of known scraper
 *
 * Warning: This is not useful for the end user, it is just a side effect of the mechanism that handles all available known scrapers
 *
 * @public exported from `@promptbook/documents`
 * @public exported from `@promptbook/cli`
 */
export const _DocumentScraperRegistration: Registration = $scrapersRegister.register(DocumentScraper);

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
