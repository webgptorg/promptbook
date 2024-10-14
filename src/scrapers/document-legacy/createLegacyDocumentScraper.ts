import { ScraperConstructor } from '../_common/ScraperConstructor';
import { LegacyDocumentScraper } from './legacyDocumentScraper';
import { LegacyDocumentScraperOptions } from './LegacyDocumentScraperOptions';

/**
 * @@@
 *
 * @public exported from `@promptbook/legacy-documents`
 */
export const createLegacyDocumentScraper = Object.assign(
    (options: LegacyDocumentScraperOptions): LegacyDocumentScraper => {
        return new LegacyDocumentScraper(options);
    },
    {
        packageName: '@promptbook/legacy-documents',
        className: 'LegacyDocumentScraper',
    },
) satisfies ScraperConstructor;

/**
 * TODO: [🦺] Is there some way how to put `packageName` and `className` on top and function definition on bottom?
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
