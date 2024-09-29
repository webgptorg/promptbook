import type { KnowledgePiecePreparedJson, string_file_path } from '../../_packages/types.index';
import { PrepareAndScrapeOptions } from '../../_packages/types.index';
import type { AbstractScraper, ScraperSourceOptions } from '../_common/AbstractScraper';
// TODO: [🏳‍🌈] Finally take pick of .json vs .ts
// import PipelineCollection from '../../../promptbook-collection/promptbook-collection';
import { Readability } from '@mozilla/readability';
import { mkdir, rm, writeFile } from 'fs/promises';
import { JSDOM } from 'jsdom';
import { dirname, join } from 'path';
import { $isRunningInNode, titleToName } from '../../_packages/utils.index';
import { IS_VERBOSE, SCRAPE_CACHE_DIRNAME } from '../../config';
import { KnowledgeScrapeError } from '../../errors/KnowledgeScrapeError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { just } from '../../utils/organization/just';
import { markdownScraper } from '../markdown/markdownScraper';
import { markdownConverter } from './utils/markdownConverter';

/**
 * Scraper for .docx files
 *
 * @see `documentationUrl` for more details
 * @public exported from `@promptbook/core`
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
     * Scrapes the docx file and returns the knowledge pieces or `null` if it can't scrape it
     */
    async scrape(
        source: ScraperSourceOptions,
        options: PrepareAndScrapeOptions,
    ): Promise<Array<Omit<KnowledgePiecePreparedJson, 'sources' | 'preparationIds'>> | null> {
        const {
            // TODO: [🧠] Maybe in node use headless browser not just JSDOM
            // externalProgramsPaths = {},
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

        const html = article?.content || jsdom.window.document.body.innerHTML;
        // <- TODO: !!!!!! Extract / postprocess html such as it is convertable by `markdownConverter`

        if (just(true)) {
            const htmlSourceFilePath = join(process.cwd(), cacheDirname, `${titleToName(source.source)}.html`);
            await mkdir(dirname(htmlSourceFilePath), { recursive: true });
            await writeFile(htmlSourceFilePath, html, 'utf-8');
        }

        const markdown = markdownConverter.makeMarkdown(html, jsdom.window.document);
        let markdownSourceFilePath: string_file_path | null = null;

        if ($isRunningInNode()) {
            markdownSourceFilePath = join(process.cwd(), cacheDirname, `${titleToName(source.source)}.md`);

            // TODO: !!!!!! Make cache dir recursively in every scraper
            await mkdir(dirname(markdownSourceFilePath), { recursive: true });
            await writeFile(markdownSourceFilePath, markdown, 'utf-8');
        }

        const markdownSource = {
            source: source.source,
            filePath: markdownSourceFilePath,
            url: null,
            mimeType: 'text/markdown',
            asText() {
                return markdown;
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
        } satisfies ScraperSourceOptions;

        const knowledge = markdownScraper.scrape(markdownSource, options);

        if (markdownSourceFilePath !== null && isCacheCleaned) {
            if (isVerbose) {
                console.info('documentScraper: Clening cache');
            }
            await rm(markdownSourceFilePath);
        }

        return knowledge;
    },
} /* TODO: [🦷] as const */ satisfies AbstractScraper;

/**
 * TODO: !!!!!! Put into separate package
 * TODO: [👣] Scraped website in .md can act as cache item - there is no need to run conversion each time
 * TODO: [🦖] Make some system for putting scrapers to separete packages
 * TODO: [🪂] Do it in parallel 11:11
 * TODO: [🦷] Ideally use `as const satisfies AbstractScraper` BUT this combination throws errors
 * Note: No need to aggregate usage here, it is done by intercepting the llmTools
 */
