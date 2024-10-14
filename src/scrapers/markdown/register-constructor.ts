import { Registration } from '../../utils/$Register';
import { $scrapersRegister } from '../_common/register/$scrapersRegister';
import { createMarkdownScraper } from './createMarkdownScraper';

/**
 * Registration of known scraper
 *
 * Warning: This is not useful for the end user, it is just a side effect of the mechanism that handles all available known scrapers
 *
 * @public exported from `@promptbook/markdown-utils`
 * @public exported from `@promptbook/cli`
 */
export const _MarkdownScraperRegistration: Registration = $scrapersRegister.register(createMarkdownScraper);

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
