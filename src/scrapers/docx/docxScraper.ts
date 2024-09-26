import type { KnowledgePiecePreparedJson } from '../../_packages/types.index';
import { PrepareOptions } from '../../_packages/types.index';
import type { AbstractScraper, ScraperSourceOptions } from '../_common/AbstractScraper';
// TODO: [🏳‍🌈] Finally take pick of .json vs .ts
// import PipelineCollection from '../../../promptbook-collection/promptbook-collection';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { markdownScraper } from '../markdown/markdownScraper';

/**
 * Scraper for .docx files
 *
 * @see `documentationUrl` for more details
 * @public exported from `@promptbook/core`
 */
export const docxScraper = {
    /**
     * Mime types that this scraper can handle
     */
    mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],

    /**
     * Link to documentation
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/@@',

    /**
     * Scrapes the docx file and returns the knowledge pieces or `null` if it can't scrape it
     */
    async scrape(
        source: ScraperSourceOptions,
        options: PrepareOptions,
    ): Promise<Array<Omit<KnowledgePiecePreparedJson, 'sources' | 'preparationIds'>> | null> {
        // TODO: !!!!!! Use or remove> const { llmTools, maxParallelCount = MAX_PARALLEL_COUNT, isVerbose = IS_VERBOSE } = options;

        // TODO: !!!!!! Use or remove> TODO_USE(maxParallelCount); // <- [🪂]

        const markdownSource = {
            source: source.source,
            mimeType: 'text/markdown',
            async asText() {
                return '!!!!!!';
            },
            async asJson() {
                throw new UnexpectedError(
                    'Did not expect that `markdownScraper` would need to get the content `asJson`',
                );
            },
            async asBlob() {
                throw new UnexpectedError(
                    'Did not expect that `markdownScraper` would need to get the content `asBlob`',
                );
            },
        } satisfies ScraperSourceOptions;

        return markdownScraper.scrape(markdownSource, options);
    },
} /* TODO: [🦷] as const */ satisfies AbstractScraper;

/**
 * TODO: !!!!!!  Same pattern for commands> as const satisfies AbstractScraper
 * TODO: [🦖] Make some system for putting scrapers to separete packages
 * TODO: [🪂] Do it in parallel 11:11
 * TODO: [🦷] Ideally use `as const satisfies AbstractScraper` BUT this combination throws errors
 * Note: No need to aggregate usage here, it is done by intercepting the llmTools
 */
