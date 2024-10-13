import { Registration } from '../../utils/$Register';
import { $scrapersRegister } from '../_common/register/$scrapersRegister';
import { createXxxxScraper } from './createXxxxScraper';

/**
 * @@@
 *
 * @public exported from `@promptbook/xxxx`
 * @public exported from `@promptbook/cli`
 */
export const _XxxxScraperRegistration: Registration = $scrapersRegister.register(createXxxxScraper);

/**
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
