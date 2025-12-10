import type { Registration } from '../../utils/misc/$Register';
import { $scrapersRegister } from '../_common/register/$scrapersRegister';
import { createWebsiteScraper } from './createWebsiteScraper';

/**
 * Registration of known scraper
 *
 * Warning: This is not useful for the end user, it is just a side effect of the mechanism that handles all available known scrapers
 *
 * @private !!!! Temporarly made private until we fix publishing on GitHub Packages
 * @xpublic exported from `@promptbook/website-crawler`
 * @xpublic exported from `@promptbook/wizard`
 * @xpublic exported from `@promptbook/cli`
 */
export const _WebsiteScraperRegistration: Registration = $scrapersRegister.register(createWebsiteScraper);

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
