import type { Registration } from '../../utils/$Register';
import { keepTypeImported } from '../../utils/organization/keepTypeImported';
import { $deepFreeze } from '../../utils/serialization/$deepFreeze';
import { $scrapersMetadataRegister } from '../_common/register/$scrapersMetadataRegister';
import type { ScraperAndConverterMetadata } from '../_common/register/ScraperAndConverterMetadata';

keepTypeImported<ScraperAndConverterMetadata>();

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
    isAvailableInBrowser: false,
    // <- Note: [🌏] Only `MarkdownScraper` makes sense to be available in the browser, for scraping non-markdown sources in the browser use a remote server
    requiredExecutables: [
        'Pandoc',
        'LibreOffice',
        //    <- TODO: [🧠] Should be 'LibreOffice' here, its dependency of dependency
    ],
}) satisfies ScraperAndConverterMetadata; /* <- Note: [🤛] */

/**
 * Registration of known scraper metadata
 *
 * Warning: This is not useful for the end user, it is just a side effect of the mechanism that handles all available known scrapers
 *
 * @public exported from `@promptbook/core`
 * @public exported from `@promptbook/wizard`
 * @public exported from `@promptbook/cli`
 */
export const _LegacyDocumentScraperMetadataRegistration: Registration =
    $scrapersMetadataRegister.register(legacyDocumentScraperMetadata);

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
