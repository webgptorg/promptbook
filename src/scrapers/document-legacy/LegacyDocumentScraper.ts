import type { KnowledgePiecePreparedJson } from '../../pipeline/PipelineJson/KnowledgePieceJson';
// TODO: [🏳‍🌈] Finally take pick of .json vs .ts
// import PipelineCollection from '../../../books/books';
import { readdir, rename, rmdir } from 'fs/promises';
import { dirname, join } from 'path';
import { spaceTrim } from 'spacetrim';
import { DEFAULT_INTERMEDIATE_FILES_STRATEGY, DEFAULT_IS_VERBOSE, DEFAULT_SCRAPE_CACHE_DIRNAME } from '../../config';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import { KnowledgeScrapeError } from '../../errors/KnowledgeScrapeError';
import { MissingToolsError } from '../../errors/MissingToolsError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import { $isRunningInNode } from '../../utils/environment/$isRunningInNode';
import { $execCommand } from '../../utils/execCommand/$execCommand';
import { getFileExtension } from '../../utils/files/getFileExtension';
import { isFileExisting } from '../../utils/files/isFileExisting';
import { DocumentScraper } from '../document/DocumentScraper';
import type { Converter } from '../_common/Converter';
import type { ScraperAndConverterMetadata } from '../_common/register/ScraperAndConverterMetadata';
import type { Scraper, ScraperSourceHandler } from '../_common/Scraper';
import type { ScraperIntermediateSource } from '../_common/ScraperIntermediateSource';
import { getScraperIntermediateSource } from '../_common/utils/getScraperIntermediateSource';
import { legacyDocumentScraperMetadata } from './register-metadata';

/**
 * Scraper for old document files (like .doc and .rtf)
 *
 * @see `documentationUrl` for more details
 *
 * @public exported from `@promptbook/legacy-documents`
 */
export class LegacyDocumentScraper implements Converter, Scraper {
    /**
     * Metadata of the scraper which includes title, mime types, etc.
     */
    public get metadata(): ScraperAndConverterMetadata {
        return legacyDocumentScraperMetadata;
    }

    /**
     * Document scraper is used internally
     */
    private readonly documentScraper: DocumentScraper;

    public constructor(
        private readonly tools: Pick<ExecutionTools, 'fs' | 'llm' | 'executables'>,
        private readonly options: PrepareAndScrapeOptions,
    ) {
        this.documentScraper = new DocumentScraper(tools, options);
    }

    /**
     * Convert the `.doc` or `.rtf`  to `.doc` file and returns intermediate source
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
            throw new KnowledgeScrapeError('Scraping .doc files is only supported in Node environment');
        }

        if (this.tools.fs === undefined) {
            throw new EnvironmentMismatchError('Can not scrape (legacy) documents without filesystem tools');
            //          <- TODO: [🧠] What is the best error type here`
        }

        if (this.tools.executables?.libreOfficePath === undefined) {
            throw new MissingToolsError('LibreOffice is required for scraping .doc and .rtf files');
        }

        if (source.filename === null) {
            // TODO: [🧠] Maybe save file as temporary
            throw new KnowledgeScrapeError('When parsing .doc or .rtf file, it must be real file in the file system');
        }

        const extension = getFileExtension(source.filename);

        const cacheFilehandler = await getScraperIntermediateSource(source, {
            rootDirname,
            cacheDirname,
            intermediateFilesStrategy,
            extension: 'docx',
            isVerbose,
        });

        if (isVerbose) {
            console.info(`documentScraper: Converting .${extension} -> .docx`);
        }

        // Note: Running Libreoffice ONLY if the file in the cache does not exist
        if (!(await isFileExisting(cacheFilehandler.filename, this.tools.fs))) {
            /**
             * Note: Unfortunately, LibreOffice does not support to specify the output file path,
             *       so we create a subfolder `libreoffice` in the same folder as the source file
             *       and then move the file to the desired location
             */
            const documentSourceOutdirPathForLibreOffice = join(dirname(cacheFilehandler.filename), 'libreoffice')
                .split('\\')
                .join('/');

            const command = `"${this.tools.executables.libreOfficePath}" --headless --convert-to docx "${source.filename}"  --outdir "${documentSourceOutdirPathForLibreOffice}"`;

            await $execCommand(command);

            const files = await readdir(documentSourceOutdirPathForLibreOffice);

            if (files.length !== 1) {
                throw new UnexpectedError(
                    spaceTrim(
                        (block) => `
                            Expected exactly 1 file in the LibreOffice output directory, got ${files.length}

                            The temporary folder:
                            ${block(documentSourceOutdirPathForLibreOffice)}

                            Command:
                            > ${block(command)}
                        `,
                    ),
                );
            }

            const file = files[0]!;

            await rename(join(documentSourceOutdirPathForLibreOffice, file), cacheFilehandler.filename);
            await rmdir(documentSourceOutdirPathForLibreOffice);

            if (!(await isFileExisting(cacheFilehandler.filename, this.tools.fs))) {
                throw new UnexpectedError(
                    spaceTrim(
                        (block) => `
                            File that was supposed to be created by LibreOffice does not exist for unknown reason

                            Expected file:
                            ${block(cacheFilehandler.filename)}

                            The temporary folder:
                            ${block(documentSourceOutdirPathForLibreOffice)}

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
     * Scrapes the `.doc` or `.rtf` file and returns the knowledge pieces or `null` if it can't scrape it
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
                throw new UnexpectedError(
                    'Did not expect that `documentScraper` would need to get the content `asText`',
                );
            },
            asJson() {
                throw new UnexpectedError(
                    'Did not expect that `documentScraper` would need to get the content `asJson`',
                );
            },
            /*
            TODO: [🥽]
                > asBlob() {
                >     throw new UnexpectedError(
                >         'Did not expect that `documentScraper` would need to get the content `asBlob`',
                >     );
                > },
            */
        } satisfies ScraperSourceHandler;

        const knowledge = await this.documentScraper.scrape(markdownSource);

        await cacheFilehandler.destroy();

        return knowledge;
    }
}

// Note: [🟢] Code for Node scraper implementation [LegacyDocumentScraper](src/scrapers/document-legacy/LegacyDocumentScraper.ts) should never be published into packages that could be imported into browser environment
// TODO: [👣] Converted documents can act as cached items - there is no need to run conversion each time
// TODO: [🪂] Do it in parallel 11:11
// Note: No need to aggregate usage here, it is done by intercepting the llmTools
