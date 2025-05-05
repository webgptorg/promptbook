import { readFile } from 'fs/promises';
import spaceTrim from 'spacetrim';
import { DEFAULT_INTERMEDIATE_FILES_STRATEGY, DEFAULT_IS_VERBOSE, DEFAULT_SCRAPE_CACHE_DIRNAME } from '../../config';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import { KnowledgeScrapeError } from '../../errors/KnowledgeScrapeError';
import { MissingToolsError } from '../../errors/MissingToolsError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { KnowledgePiecePreparedJson } from '../../pipeline/PipelineJson/KnowledgePieceJson';
import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import { $isRunningInNode } from '../../utils/environment/$isRunningInNode';
import { $execCommand } from '../../utils/execCommand/$execCommand';
import { getFileExtension } from '../../utils/files/getFileExtension';
import { isFileExisting } from '../../utils/files/isFileExisting';
import type { Converter } from '../_common/Converter';
import type { ScraperAndConverterMetadata } from '../_common/register/ScraperAndConverterMetadata';
import type { Scraper, ScraperSourceHandler } from '../_common/Scraper';
import type { ScraperIntermediateSource } from '../_common/ScraperIntermediateSource';
import { getScraperIntermediateSource } from '../_common/utils/getScraperIntermediateSource';
import { MarkdownScraper } from '../markdown/MarkdownScraper';
import { boilerplateScraperMetadata } from './register-metadata';

/**
 * Scraper of @@ files
 *
 * @see `documentationUrl` for more details
 * @public exported from `@promptbook/boilerplate`
 */
export class BoilerplateScraper implements Converter, Scraper {
    /**
     * Metadata of the scraper which includes title, mime types, etc.
     */
    public get metadata(): ScraperAndConverterMetadata {
        return boilerplateScraperMetadata;
    }

    /**
     * Markdown scraper is used internally
     */
    private readonly markdownScraper: MarkdownScraper;

    public constructor(
        private readonly tools: Pick<ExecutionTools, 'fs' | 'llm' | 'executables'>,
        private readonly options: PrepareAndScrapeOptions,
    ) {
        this.markdownScraper = new MarkdownScraper(tools, options);
    }

    /**
     * Convert the `.@@`  to `.md` file and returns intermediate source
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

        // TODO: @@ Preserve or delete
        if (!$isRunningInNode()) {
            throw new KnowledgeScrapeError('BoilerplateScraper is only supported in Node environment');
        }

        // TODO: @@ Preserve or delete
        if (this.tools.fs === undefined) {
            throw new EnvironmentMismatchError('Can not scrape boilerplates without filesystem tools');
            //          <- TODO: [🧠] What is the best error type here`
        }

        // TODO: @@ Preserve, delete or modify
        if (this.tools.executables?.pandocPath === undefined) {
            throw new MissingToolsError('Pandoc is required for scraping .docx files');
        }

        // TODO: @@ Preserve, delete or modify
        if (source.filename === null) {
            // TODO: [🧠] Maybe save file as temporary
            throw new KnowledgeScrapeError('When parsing .@@ file, it must be real file in the file system');
        }

        const extension = getFileExtension(source.filename);

        const cacheFilehandler = await getScraperIntermediateSource(source, {
            rootDirname,
            cacheDirname,
            intermediateFilesStrategy,
            extension: 'md',
            isVerbose,
        });

        // TODO: @@ Preserve, delete or modify
        // Note: Running Pandoc ONLY if the file in the cache does not exist
        if (!(await isFileExisting(cacheFilehandler.filename, this.tools.fs))) {
            const command = `"${this.tools.executables.pandocPath}" -f ${extension} -t markdown "${source.filename}" -o "${cacheFilehandler.filename}"`;

            await $execCommand(command);

            // Note: [0]
            if (!(await isFileExisting(cacheFilehandler.filename, this.tools.fs))) {
                throw new UnexpectedError(
                    spaceTrim(
                        (block) => `
                    File that was supposed to be created by Pandoc does not exist for unknown reason

                    Expected file:
                    ${block(cacheFilehandler.filename)}

                    Command:
                    > ${block(command)}

                `,
                    ),
                );
            }
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

        // TODO: @@ Preserve, delete or modify
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
 * TODO: [👣] Converted documents can act as cached items - there is no need to run conversion each time
 * TODO: [🪂] Do it in parallel
 * Note: No need to aggregate usage here, it is done by intercepting the llmTools
 * @@ Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
