import type { KnowledgePiecePreparedJson } from '../../types/PipelineJson/KnowledgePieceJson';
// TODO: [🏳‍🌈] Finally take pick of .json vs .ts
// import PipelineCollection from '../../../promptbook-collection/promptbook-collection';
import { readFile } from 'fs/promises';
import spaceTrim from 'spacetrim';
import { IS_VERBOSE, SCRAPE_CACHE_DIRNAME } from '../../config';
import { KnowledgeScrapeError } from '../../errors/KnowledgeScrapeError';
import { MissingToolsError } from '../../errors/MissingToolsError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { $isRunningInNode } from '../../utils/environment/$isRunningInNode';
import { $execCommand } from '../../utils/execCommand/$execCommand';
import { $isFileExisting } from '../../utils/files/$isFileExisting';
import { getFileExtension } from '../../utils/files/getFileExtension';
import type { Converter } from '../_common/Converter';
import type { Scraper, ScraperSourceHandler } from '../_common/Scraper';
import type { ScraperIntermediateSource } from '../_common/ScraperIntermediateSource';
import { getScraperIntermediateSource } from '../_common/utils/getScraperIntermediateSource';
import { DocumentScraperOptions } from './DocumentScraperOptions';

/**
 * Scraper of .docx and .odt files
 *
 * @see `documentationUrl` for more details
 * @public exported from `@promptbook/documents`
 */
export class DocumentScraper implements Converter, Scraper {
    /**
     * Mime types that this scraper can handle
     */
    public readonly mimeTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    /**
     * Link to documentation
     */
    public readonly documentationUrl = 'https://github.com/webgptorg/promptbook/discussions/@@';

    public constructor(private readonly options: DocumentScraperOptions) {}

    /**
     * Convert the `.docx` or `.odt`  to `.md` file and returns intermediate source
     *
     * Note: `$` is used to indicate that this function is not a pure function - it leaves files on the disk and you are responsible for cleaning them by calling `destroy` method of returned object
     */
    public async $convert(source: ScraperSourceHandler): Promise<ScraperIntermediateSource> {
        const {
            externalProgramsPaths = {},
            rootDirname,
            cacheDirname = SCRAPE_CACHE_DIRNAME,
            isCacheCleaned = false,
            isVerbose = IS_VERBOSE,
        } = this.options;

        if (!$isRunningInNode()) {
            throw new KnowledgeScrapeError('Scraping .docx files is only supported in Node environment');
        }

        if (externalProgramsPaths.pandocPath === undefined) {
            throw new MissingToolsError('Pandoc is required for scraping .docx files');
        }

        if (source.filename === null) {
            // TODO: [🧠] Maybe save file as temporary
            throw new KnowledgeScrapeError('When parsing .docx file, it must be real file in the file system');
        }

        const extension = getFileExtension(source.filename);

        const cacheFilehandler = await getScraperIntermediateSource(source, {
            rootDirname,
            cacheDirname,
            isCacheCleaned,
            extension: 'md',
            isVerbose,
        });

        // Note: Running Pandoc ONLY if the file in the cache does not exist
        if (!(await $isFileExisting(cacheFilehandler.filename))) {
            const command = `"${externalProgramsPaths.pandocPath}" -f ${extension} -t markdown "${source.filename}" -o "${cacheFilehandler.filename}"`;

            // TODO: !!!!!! [🕊] Make execCommand standard (?node-)util of the promptbook
            await $execCommand(command);

            // Note: [0]
            if (!(await $isFileExisting(cacheFilehandler.filename))) {
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
    ): Promise<Array<Omit<KnowledgePiecePreparedJson, 'sources' | 'preparationIds'>> | null> {
        const cacheFilehandler = await this.$convert(source);

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
            asBlob() {
                throw new UnexpectedError(
                    'Did not expect that `markdownScraper` would need to get the content `asBlob`',
                );
            },
        } satisfies ScraperSourceHandler;

        const knowledge = this.options.markdownScraper.scrape(markdownSource);

        await cacheFilehandler.destroy();

        return knowledge;
    }
}

/**
 * TODO: [👣] Converted documents can act as cached items - there is no need to run conversion each time
 * TODO: [🦖] Make some system for putting scrapers to separete packages
 * TODO: [🪂] Do it in parallel 11:11
 * Note: No need to aggregate usage here, it is done by intercepting the llmTools
 */
