import { ScraperConstructor } from '../_common/ScraperConstructor';
import { MarkdownScraper } from './MarkdownScraper';
import { MarkdownScraperOptions } from './MarkdownScraperOptions';
import { markdownScraperMetadata } from './register-metadata';

/**
 * @@@
 *
 * @public exported from `@promptbook/markdown-utils`
 */
export const createMarkdownScraper = Object.assign((options: MarkdownScraperOptions): MarkdownScraper => {
    return new MarkdownScraper(options);
}, markdownScraperMetadata) satisfies ScraperConstructor;

/**
 * TODO: [🦺] Is there some way how to put `packageName` and `className` on top and function definition on bottom?
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
