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
export const boilerplateScraperMetadata = $deepFreeze({
    title: 'Boilerplate scraper',
    packageName: '@promptbook/boilerplate',
    className: 'BoilerplateScraper',
    mimeTypes: [
        '@@@/@@@',
        // <- TODO: @@@ Add compatible mime types with Boilerplate scraper
    ],
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/@@@',
    isAvilableInBrowser: false, // <- TODO: @@@ Is it avilable in browser?
    // <- Note: [🌏] Only `MarkdownScraper` makes sense to be available in the browser, for scraping non-markdown sources in the browser use a remote server
    requiredExecutables: [
        /* @@@ 'Pandoc' */
    ],
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
export const _BoilerplateScraperMetadataRegistration: Registration =
    $scrapersMetadataRegister.register(boilerplateScraperMetadata);

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
