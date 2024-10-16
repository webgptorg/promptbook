import type { KnowledgePiecePreparedJson } from '../../types/PipelineJson/KnowledgePieceJson';
import type { Scraper, ScraperSourceHandler } from '../_common/Scraper';
// TODO: [🏳‍🌈] Finally take pick of .json vs .ts
// import PipelineCollection from '../../../promptbook-collection/promptbook-collection';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import type { Converter } from '../_common/Converter';
import type { ScraperIntermediateSource } from '../_common/ScraperIntermediateSource';
import { PdfScraperOptions } from './PdfScraperOptions';
import { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import { ExecutionTools } from '../../execution/ExecutionTools';

/**
 * Scraper for .docx files
 *
 * @see `documentationUrl` for more details
 * @public exported from `@promptbook/pdf`
 */
export class PdfScraper implements Converter, Scraper {
    /**
     * Mime types that this scraper can handle
     */
    public readonly mimeTypes = ['application/pdf'];

    /**
     * Link to documentation
     */
    public readonly documentationUrl = 'https://github.com/webgptorg/promptbook/discussions/@@';

    public constructor(    private readonly tools: Pick<ExecutionTools, 'llm'>,private readonly options: PrepareAndScrapeOptions) {}

    /**
     * Converts the `.pdf` file to `.md` file and returns intermediate source
     */
    public async $convert(source: ScraperSourceHandler): Promise<ScraperIntermediateSource> {
        TODO_USE(source);
        TODO_USE(this.options);
        throw new NotYetImplementedError('PDF conversion not yet implemented');
    }

    /**
     * Scrapes the `.pdf` file and returns the knowledge pieces or `null` if it can't scrape it
     */
    public async scrape(
        source: ScraperSourceHandler,
    ): Promise<Array<Omit<KnowledgePiecePreparedJson, 'sources' | 'preparationIds'>> | null> {
        TODO_USE(source);
        TODO_USE(this.options);

        /*
        const {
            externalProgramsPaths = {},
            cacheDirname = SCRAPE_CACHE_DIRNAME,
            isCacheCleaned = false,
            isVerbose = IS_VERBOSE,
        } = options;
        */

        throw new NotYetImplementedError('PDF scraping not yet implemented');
    }
}

/**
 * TODO: [👣] Converted pdf documents can act as cached items - there is no need to run conversion each time
 * TODO: [🪂] Do it in parallel 11:11
 * Note: No need to aggregate usage here, it is done by intercepting the llmTools
 */