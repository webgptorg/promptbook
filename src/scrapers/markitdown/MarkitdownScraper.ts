import { readFile } from 'fs/promises';
import type { MarkItDown } from 'markitdown-ts'; // <- TODO: !!! Use Markitdown directly not through this package
import { DEFAULT_INTERMEDIATE_FILES_STRATEGY } from '../../config';
import { DEFAULT_IS_VERBOSE } from '../../config';
import { DEFAULT_SCRAPE_CACHE_DIRNAME } from '../../config';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import { KnowledgeScrapeError } from '../../errors/KnowledgeScrapeError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { KnowledgePiecePreparedJson } from '../../pipeline/PipelineJson/KnowledgePieceJson';
import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import { $isRunningInNode } from '../../utils/environment/$isRunningInNode';
import { isFileExisting } from '../../utils/files/isFileExisting';
import type { Converter } from '../_common/Converter';
import type { ScraperAndConverterMetadata } from '../_common/register/ScraperAndConverterMetadata';
import type { Scraper } from '../_common/Scraper';
import type { ScraperSourceHandler } from '../_common/Scraper';
import type { ScraperIntermediateSource } from '../_common/ScraperIntermediateSource';
import { getScraperIntermediateSource } from '../_common/utils/getScraperIntermediateSource';
import { MarkdownScraper } from '../markdown/MarkdownScraper';
import { markitdownScraperMetadata } from './register-metadata';

/**
 * Integration of Markitdown by Microsoft into Promptbook
 *
 * @see https://github.com/microsoft/markitdown
 * @see `documentationUrl` for more details
 * @public exported from `@promptbook/markitdown`
 * @public exported from `@promptbook/pdf`
 */
export class MarkitdownScraper implements Converter, Scraper {
    /**
     * Metadata of the scraper which includes title, mime types, etc.
     */
    public get metadata(): ScraperAndConverterMetadata {
        return markitdownScraperMetadata;
    }

    /**
     * Markdown scraper is used internally
     */
    private readonly markdownScraper: MarkdownScraper;

    /**
     * Markdown scraper is used internally
     */
    private readonly markitdown: MarkItDown;

    public constructor(
        private readonly tools: Pick<ExecutionTools, 'fs' | 'llm' | 'executables'>,
        private readonly options: PrepareAndScrapeOptions,
    ) {
        this.markdownScraper = new MarkdownScraper(tools, options);

        // Note: Module `markitdown-ts` has no types available, so it is imported using `require`
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { MarkItDown } = require('markitdown-ts');
        // <- TODO: 'Use Markitdown directly not through this package

        this.markitdown = new MarkItDown();
    }

    /**
     * Convert the documents to `.md` file and returns intermediate source
     *
     * Note: `$` is used to indicate that this function is not a pure function - it leaves files on the disk and you are responsible for cleaning them by calling `destroy` method of returned object
     */
    public async $convert(source: ScraperSourceHandler): Promise<ScraperIntermediateSource> {
        const {
            rootDirname = process.cwd(),
            cacheDirname = DEFAULT_SCRAPE_CACHE_DIRNAME,
            intermediateFilesStrategy = DEFAULT_INTERMEDIATE_FILES_STRATEGY,
            isVerbose = DEFAULT_IS_VERBOSE,
        } = this.options;

        if (!$isRunningInNode()) {
            throw new KnowledgeScrapeError('MarkitdownScraper is only supported in Node environment');
        }

        if (this.tools.fs === undefined) {
            throw new EnvironmentMismatchError('Can not scrape boilerplates without filesystem tools');
            //          <- TODO: [🧠] What is the best error type here`
        }

        const cacheFilehandler = await getScraperIntermediateSource(source, {
            rootDirname,
            cacheDirname,
            intermediateFilesStrategy,
            extension: 'md',
            isVerbose,
        });

        // TODO: @@@ Preserve, delete or modify
        // Note: Running Pandoc ONLY if the file in the cache does not exist
        if (!(await isFileExisting(cacheFilehandler.filename, this.tools.fs))) {
            const src = source.filename || source.url || null;

            // console.log('!!', { src, source, cacheFilehandler });

            if (src === null) {
                throw new UnexpectedError('Source has no filename or url');
            }

            const result = await this.markitdown.convert(src, {
                // TODO: Pass when sacraping Youtube
                // enableYoutubeTranscript: true,
                // youtubeTranscriptLanguage: 'en',
            });

            if (result === null || result === undefined) {
                throw new Error(`Markitdown could not convert the "${source.source}"`);
                // <- TODO: !!! Make MarkitdownError
            }

            // console.log('!!', { result, cacheFilehandler });

            await this.tools.fs.writeFile(cacheFilehandler.filename, result.text_content);
        }

        return cacheFilehandler;
    }

    /**
     * Scrapes the docx file and returns the knowledge pieces or `null` if it can't scrape it
     */
    public async scrape(
        source: ScraperSourceHandler,
    ): Promise<ReadonlyArray<Omit<KnowledgePiecePreparedJson, 'sources' | 'preparationIds'>> | null> {
        const cacheFilehandler = await this.$convert(source);

        // TODO: @@@ Preserve, delete or modify
        const markdownSource = {
            source: source.source,
            filename: cacheFilehandler.filename,
            url: null,
            mimeType: 'text/markdown',
            async asText() {
                // Note: [0] In $convert we check that the file exists
                return await readFile(cacheFilehandler.filename, 'utf-8');
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
 * TODO: [🧠][🌜] Export only from `@promptbook/markitdown` or `@promptbook/pdf` NOT both
 * TODO: [👣] Converted documents can act as cached items - there is no need to run conversion each time
 * TODO: [🪂] Do it in parallel
 * Note: No need to aggregate usage here, it is done by intercepting the llmTools
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
