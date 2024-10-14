import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import type { KnowledgePiecePreparedJson } from '../../types/PipelineJson/KnowledgePieceJson';
import type { string_markdown } from '../../types/typeAliases';
import type { Converter } from '../_common/Converter';
import type { Scraper, ScraperSourceHandler } from '../_common/Scraper';
// TODO: [🏳‍🌈] Finally take pick of .json vs .ts
// import PipelineCollection from '../../../promptbook-collection/promptbook-collection';
import { Readability } from '@mozilla/readability';
import { writeFile } from 'fs/promises';
import { JSDOM } from 'jsdom';
import { forTime } from 'waitasecond';
import { IS_VERBOSE, SCRAPE_CACHE_DIRNAME } from '../../config';
import { KnowledgeScrapeError } from '../../errors/KnowledgeScrapeError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { ScraperIntermediateSource } from '../_common/ScraperIntermediateSource';
import { getScraperIntermediateSource } from '../_common/utils/getScraperIntermediateSource';
import { markdownScraper } from '../markdown/markdownScraper';
import { markdownConverter } from './utils/markdownConverter';

/**
 * Scraper for .docx files
 *
 * @see `documentationUrl` for more details
 * @public exported from `@promptbook/crawler`
 */
export const websiteScraper = {
    /**
     * Mime types that this scraper can handle
     */
    mimeTypes: ['text/html'],

    /**
     * Link to documentation
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/@@',

    /**
     * Convert the website  to `.md` file and returns intermediate source
     *
     * Note: `$` is used to indicate that this function is not a pure function - it leaves files on the disk and you are responsible for cleaning them by calling `destroy` method of returned object
     */
    async $convert(
        source: ScraperSourceHandler,
        options: PrepareAndScrapeOptions,
    ): Promise<ScraperIntermediateSource & { markdown: string_markdown }> {
        const {
            // TODO: [🧠] Maybe in node use headless browser not just JSDOM
            // externalProgramsPaths = {},
            rootDirname,
            cacheDirname = SCRAPE_CACHE_DIRNAME,
            isCacheCleaned = false,
            isVerbose = IS_VERBOSE,
        } = options;

        // TODO: !!!!!! Does this work in browser? Make it work.

        if (source.url === null) {
            throw new KnowledgeScrapeError('Website scraper requires URL');
        }

        const jsdom = new JSDOM(await source.asText(), {
            url: source.url,
        });

        const reader = new Readability(jsdom.window.document);
        const article = reader.parse();

        console.log(article);
        await forTime(10000);

        let html = article?.content || article?.textContent || jsdom.window.document.body.innerHTML;

        // Note: Unwrap html such as it is convertable by `markdownConverter`
        for (let i = 0; i < 2; i++) {
            html = html.replace(/<div\s*(?:id="readability-page-\d+"\s+class="page")?>(.*)<\/div>/is, '$1');
        }

        if (html.includes('<div')) {
            html = article?.textContent || '';
        }

        const cacheFilehandler = await getScraperIntermediateSource(source, {
            rootDirname,
            cacheDirname,
            isCacheCleaned,
            extension: 'html',
            isVerbose,
        });

        await writeFile(cacheFilehandler.filename, html, 'utf-8');

        const markdown = markdownConverter.makeMarkdown(html, jsdom.window.document);

        return { ...cacheFilehandler, markdown };
    },

    /**
     * Scrapes the website and returns the knowledge pieces or `null` if it can't scrape it
     */
    async scrape(
        source: ScraperSourceHandler,
        options: PrepareAndScrapeOptions,
    ): Promise<Array<Omit<KnowledgePiecePreparedJson, 'sources' | 'preparationIds'>> | null> {
        const cacheFilehandler = await websiteScraper.$convert(source, options);

        const markdownSource = {
            source: source.source,
            filename: cacheFilehandler.filename,
            url: null,
            mimeType: 'text/markdown',
            asText() {
                return cacheFilehandler.markdown;
            },
            asJson() {
                throw new UnexpectedError(
                    'Did not expect that `markdownScraper` would need to get the content `asJson`',
                );
            },
            asBlob() {
                throw new UnexpectedError(
                    'Did not expect that `markdownScraper` would need to get the content `asBlob`',
                );
            },
        } satisfies ScraperSourceHandler;

        const knowledge = markdownScraper.scrape(markdownSource, options);

        await cacheFilehandler.destroy();

        return knowledge;
    },
} /* TODO: [🦷] as const */ satisfies Converter & Scraper;

/**
 * TODO: !!!!!! Put into separate package
 * TODO: [👣] Scraped website in .md can act as cache item - there is no need to run conversion each time
 * TODO: [🦖] Make some system for putting scrapers to separete packages
 * TODO: [🪂] Do it in parallel 11:11
 * TODO: [🦷] Ideally use `as const satisfies Converter & Scraper` BUT this combination throws errors
 * Note: No need to aggregate usage here, it is done by intercepting the llmTools
 */
