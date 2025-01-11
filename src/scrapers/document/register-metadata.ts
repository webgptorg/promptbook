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
export const documentScraperMetadata = $deepFreeze({
    title: 'Document scraper',
    packageName: '@promptbook/documents',
    className: 'DocumentScraper',
    mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/@@',
    isAvilableInBrowser: false,
    // <- Note: [🌏] Only `MarkdownScraper` makes sense to be available in the browser, for scraping non-markdown sources in the browser use a remote server
    requiredExecutables: ['Pandoc'],
}) satisfies ScraperAndConverterMetadata; /* <- Note: [🤛] */

/**
 * Registration of known scraper metadata
 *
 * Warning: This is not useful for the end user, it is just a side effect of the mechanism that handles all available known scrapers
 *
 * @public exported from `@promptbook/core`
 * @public exported from `@promptbook/wizzard`
 * @public exported from `@promptbook/cli`
 */
export const _DocumentScraperMetadataRegistration: Registration =
    $scrapersMetadataRegister.register(documentScraperMetadata);

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
