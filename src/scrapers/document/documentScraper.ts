import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
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
import { execCommand } from '../../utils/execCommand/execCommand';
import { $isFileExisting } from '../../utils/files/$isFileExisting';
import { getFileExtension } from '../../utils/files/getFileExtension';
import type { Converter } from '../_common/Converter';
import type { Scraper, ScraperSourceHandler } from '../_common/Scraper';
import type { ScraperIntermediateSource } from '../_common/ScraperIntermediateSource';
import { getScraperIntermediateSource } from '../_common/utils/getScraperIntermediateSource';
import { markdownScraper } from '../markdown/markdownScraper';

/**
 * Scraper of .docx and .odt files
 *
 * @see `documentationUrl` for more details
 * @public exported from `@promptbook/core`
 */
export const documentScraper = {
    /**
     * Mime types that this scraper can handle
     */
    mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],

    /**
     * Link to documentation
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/@@',

    /**
     * Convert the `.docx` or `.odt`  to `.md` file and returns intermediate source
     *
     * Note: `$` is used to indicate that this function is not a pure function - it leaves files on the disk and you are responsible for cleaning them by calling `destroy` method of returned object
     */
    async $convert(source: ScraperSourceHandler, options: PrepareAndScrapeOptions): Promise<ScraperIntermediateSource> {
        const {
            externalProgramsPaths = {},
            rootDirname,
            cacheDirname = SCRAPE_CACHE_DIRNAME,
            isCacheCleaned = false,
            isVerbose = IS_VERBOSE,
        } = options;

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
            await execCommand(command);

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
    },

    /**
     * Scrapes the docx file and returns the knowledge pieces or `null` if it can't scrape it
     */
    async scrape(
        source: ScraperSourceHandler,
        options: PrepareAndScrapeOptions,
    ): Promise<Array<Omit<KnowledgePiecePreparedJson, 'sources' | 'preparationIds'>> | null> {
        const cacheFilehandler = await documentScraper.$convert(source, options);

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

        const knowledge = markdownScraper.scrape(markdownSource, options);

        await cacheFilehandler.destroy();

        return knowledge;
    },
} /* TODO: [🦷] as const */ satisfies Converter & Scraper;

/**
 * TODO: [👣] Converted documents can act as cached items - there is no need to run conversion each time
 * TODO: [🦖] Make some system for putting scrapers to separete packages
 * TODO: [🪂] Do it in parallel 11:11
 * TODO: [🦷] Ideally use `as const satisfies Converter & Scraper` BUT this combination throws errors
 * Note: No need to aggregate usage here, it is done by intercepting the llmTools
 */
