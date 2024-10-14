import { ScraperConstructor } from '../_common/ScraperConstructor';
import { PdfScraperOptions } from './PdfScraperOptions';

/**
 * @@@
 *
 * @public exported from `@promptbook/pdf`
 */
export const createPdfScraper = Object.assign(
    (options: PdfScraperOptions): PdfScraper => {
        return new PdfScraper(options);
    },
    {
        packageName: '@promptbook/pdf',
        className: 'PdfScraper',
    },
) satisfies ScraperConstructor;

/**
 * TODO: [🦺] Is there some way how to put `packageName` and `className` on top and function definition on bottom?
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
