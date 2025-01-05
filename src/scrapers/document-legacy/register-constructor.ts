import type { Registration } from '../../utils/$Register';
import { $scrapersRegister } from '../_common/register/$scrapersRegister';
import { createLegacyDocumentScraper } from './createLegacyDocumentScraper';

/**
 * Registration of known scraper
 *
 * Warning: This is not useful for the end user, it is just a side effect of the mechanism that handles all available known scrapers
 *
 * @public exported from `@promptbook/legacy-documents`
 * @public exported from `@promptbook/wizzard`
 * @public exported from `@promptbook/cli`
 */
export const _LegacyDocumentScraperRegistration: Registration = $scrapersRegister.register(createLegacyDocumentScraper);

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
