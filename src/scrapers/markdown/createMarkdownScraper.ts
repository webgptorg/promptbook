import { ScraperConstructor } from '../_common/ScraperConstructor';
import { MarkdownScraper } from './MarkdownScraper';
import { MarkdownScraperOptions } from './MarkdownScraperOptions';

/**
 * @@@
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export const createMarkdownScraper = Object.assign(
    (options: MarkdownScraperOptions): MarkdownScraper => {
        return new MarkdownScraper(options);
    },
    {
        packageName: '@promptbook/markdown-utils',
        className: 'MarkdownScraper',
    },
) satisfies ScraperConstructor;

/**
 * TODO: [🦺] Is there some way how to put `packageName` and `className` on top and function definition on bottom?
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
