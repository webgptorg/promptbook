import { ScraperConstructor } from '../_common/ScraperConstructor';
import { XxxxScraperOptions } from './XxxxScraperOptions';

/**
 * @@@
 *
 * @public exported from `@promptbook/xxxx`
 */
export const createXxxxScraper = Object.assign(
    (options: XxxxScraperOptions): XxxxScraper => {
        return new XxxxScraper(options);
    },
    {
        packageName: '@promptbook/xxxx',
        className: 'XxxxScraper',
    },
) satisfies ScraperConstructor;

/**
 * TODO: [🦺] Is there some way how to put `packageName` and `className` on top and function definition on bottom?
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
