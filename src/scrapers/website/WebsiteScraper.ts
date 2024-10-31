import type { KnowledgePiecePreparedJson } from '../../types/PipelineJson/KnowledgePieceJson';
import type { string_markdown } from '../../types/typeAliases';
import type { Converter } from '../_common/Converter';
import type { Scraper, ScraperSourceHandler } from '../_common/Scraper';
// TODO: [🏳‍🌈] Finally take pick of .json vs .ts
// import PipelineCollection from '../../../promptbook-collection/promptbook-collection';
import { Readability } from '@mozilla/readability';
import { Converter as ShowdownConverter } from 'showdown';
import { KnowledgeScrapeError } from '../../errors/KnowledgeScrapeError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import type { really_any } from '../../utils/organization/really_any';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import type { ScraperAndConverterMetadata } from '../_common/register/ScraperAndConverterMetadata';
import type { ScraperIntermediateSource } from '../_common/ScraperIntermediateSource';
import { MarkdownScraper } from '../markdown/MarkdownScraper';
import { websiteScraperMetadata } from './register-metadata';

/**
 * Scraper for websites
 *
 * @see `documentationUrl` for more details
 * @public exported from `@promptbook/website-crawler`
 */
export class WebsiteScraper implements Converter, Scraper {
    /**
     * Metadata of the scraper which includes title, mime types, etc.
     */
    public get metadata(): ScraperAndConverterMetadata {
        return websiteScraperMetadata;
    }

    /**
     * Markdown scraper is used internally
     */
    private readonly markdownScraper: MarkdownScraper;

    public constructor(
        private readonly tools: Pick<ExecutionTools, 'fs' | 'llm'>,
        private readonly options: PrepareAndScrapeOptions,
    ) {
        this.markdownScraper = new MarkdownScraper(tools, options);
        TODO_USE(Readability);
        TODO_USE(ShowdownConverter);
    }

    /**
     * Convert the website  to `.md` file and returns intermediate source
     *
     * Note: `$` is used to indicate that this function is not a pure function - it leaves files on the disk and you are responsible for cleaning them by calling `destroy` method of returned object
     */
    public async $convert(
        source: ScraperSourceHandler,
    ): Promise<ScraperIntermediateSource & { markdown: string_markdown }> {
        if (source.url === null) {
            throw new KnowledgeScrapeError('Website scraper requires URL');
        }

        // console.log(article);
        // await forTime(10000);

        const markdown = ``;

        return { ...source, markdown, destroy() {} } as really_any;
    }

    /**
     * Scrapes the website and returns the knowledge pieces or `null` if it can't scrape it
     */
    public async scrape(
        source: ScraperSourceHandler,
    ): Promise<ReadonlyArray<Omit<KnowledgePiecePreparedJson, 'sources' | 'preparationIds'>> | null> {
        const cacheFilehandler = await this.$convert(source);

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
            /*
            TODO: [🥽]
                > asBlob() {
                >     throw new UnexpectedError(
                >         'Did not expect that `markdownScraper` would need to get the content `asBlob`',
                >     );
                > },
            */
        } satisfies ScraperSourceHandler;

        const knowledge = this.markdownScraper.scrape(markdownSource);

        await cacheFilehandler.destroy();

        return knowledge;
    }
}

/**
 * TODO: [👣] Scraped website in .md can act as cache item - there is no need to run conversion each time
 * TODO: [🪂] Do it in parallel 11:11
 * Note: No need to aggregate usage here, it is done by intercepting the llmTools
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
