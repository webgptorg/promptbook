import type { Registration } from '../../utils/$Register';
import { $deepFreeze } from '../../utils/serialization/$deepFreeze';
import { $scrapersMetadataRegister } from '../_common/register/$scrapersMetadataRegister';
import { ScraperAndConverterMetadata } from '../_common/register/ScraperAndConverterMetadata';

/**
 * Metadata of the scraper
 *
 * @private within the scraper directory
 */
export const markdownScraperMetadata = $deepFreeze({
    title: 'Markdown scraper',
    packageName: '@promptbook/markdown-utils',
    className: 'MarkdownScraper',
    mimeTypes: ['text/markdown', 'text/plain'],
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/@@',

    isAvilableInBrowser: false,
    requiredExecutables: ['!!!!!!'],
}) satisfies ScraperAndConverterMetadata/* <- TODO: [🤛] */;

/**
 * Registration of known scraper metadata
 *
 * Warning: This is not useful for the end user, it is just a side effect of the mechanism that handles all available known scrapers
 *
 * @public exported from `@promptbook/core`
 * @public exported from `@promptbook/cli`
 */
export const _MarkdownScraperMetadataRegistration: Registration =
    $scrapersMetadataRegister.register(markdownScraperMetadata);
