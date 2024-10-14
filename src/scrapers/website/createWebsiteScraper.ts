import { ScraperConstructor } from '../_common/ScraperConstructor';
import { WebsiteScraperOptions } from './WebsiteScraperOptions';

/**
 * @@@
 *
 * @public exported from `@promptbook/crawler`
 */
export const createWebsiteScraper = Object.assign(
    (options: WebsiteScraperOptions): WebsiteScraper => {
        return new WebsiteScraper(options);
    },
    {
        packageName: '@promptbook/crawler',
        className: 'WebsiteScraper',
    },
) satisfies ScraperConstructor;

/**
 * TODO: [🦺] Is there some way how to put `packageName` and `className` on top and function definition on bottom?
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
