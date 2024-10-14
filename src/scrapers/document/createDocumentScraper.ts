import { ScraperConstructor } from '../_common/ScraperConstructor';
import { DocumentScraper } from './DocumentScraper';
import { DocumentScraperOptions } from './DocumentScraperOptions';

/**
 * @@@
 *
 * @public exported from `@promptbook/documents`
 */
export const createDocumentScraper = Object.assign(
    (options: DocumentScraperOptions): DocumentScraper => {
        return new DocumentScraper(options);
    },
    {
        packageName: '@promptbook/documents',
        className: 'DocumentScraper',
    },
) satisfies ScraperConstructor;

/**
 * TODO: [🦺] Is there some way how to put `packageName` and `className` on top and function definition on bottom?
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
