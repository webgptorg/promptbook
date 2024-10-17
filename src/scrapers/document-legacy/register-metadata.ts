import { $deepFreeze } from '../../_packages/utils.index';
import { Registration } from '../../utils/$Register';
import { $scrapersMetadataRegister } from '../_common/register/$scrapersMetadataRegister';
import { ScraperAndConverterMetadata } from '../_common/register/ScraperAndConverterMetadata';

/**
 * Metadata of the scraper
 *
 * @private within the scraper directory
 */
export const legacyDocumentScraperMetadata = $deepFreeze({
    title: 'LegacyDocument scraper',
    packageName: '@promptbook/legacy-documents',
    className: 'LegacyDocumentScraper',
    mimeTypes: ['application/msword', 'text/rtf'],
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/@@',

    isAvilableInBrowser: false,
    requiredExecutables: ['!!!!!!'],
}) satisfies ScraperAndConverterMetadata;

/**
 * Registration of known scraper metadata
 *
 * Warning: This is not useful for the end user, it is just a side effect of the mechanism that handles all available known scrapers
 *
 * @public exported from `@promptbook/core`
 * @public exported from `@promptbook/cli`
 */
export const _LegacyDocumentScraperMetadataRegistration: Registration =
    $scrapersMetadataRegister.register(legacyDocumentScraperMetadata);
