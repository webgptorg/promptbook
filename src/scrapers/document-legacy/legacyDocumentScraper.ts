import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import type { KnowledgePiecePreparedJson } from '../../types/PipelineJson/KnowledgePieceJson';
// TODO: [🏳‍🌈] Finally take pick of .json vs .ts
// import PipelineCollection from '../../../promptbook-collection/promptbook-collection';
import { readdir, rename, rmdir } from 'fs/promises';
import { dirname, join } from 'path';
import spaceTrim from 'spacetrim';
import { IS_VERBOSE } from '../../config';
import { SCRAPE_CACHE_DIRNAME } from '../../config';
import { KnowledgeScrapeError } from '../../errors/KnowledgeScrapeError';
import { MissingToolsError } from '../../errors/MissingToolsError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { $isRunningInNode } from '../../utils/environment/$isRunningInNode';
import { $execCommand } from '../../utils/execCommand/$execCommand';
import { $isFileExisting } from '../../utils/files/$isFileExisting';
import { getFileExtension } from '../../utils/files/getFileExtension';
import type { Converter } from '../_common/Converter';
import type { Scraper } from '../_common/Scraper';
import type { ScraperSourceHandler } from '../_common/Scraper';
import type { ScraperIntermediateSource } from '../_common/ScraperIntermediateSource';
import { getScraperIntermediateSource } from '../_common/utils/getScraperIntermediateSource';
import { documentScraper } from '../document/documentScraper';

/**
 * Scraper for .docx files
 *
 * @see `documentationUrl` for more details
 * @public exported from `@promptbook/legacy-documents`
 */
export const legacyDocumentScraper = {
    /**
     * Mime types that this scraper can handle
     */
    mimeTypes: ['application/msword', 'text/rtf'],

    /**
     * Link to documentation
     */
    documentationUrl: 'https://github.com/webgptorg/promptbook/discussions/@@',

    /**
     * Convert the `.doc` or `.rtf`  to `.doc` file and returns intermediate source
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
            throw new KnowledgeScrapeError('Scraping .doc files is only supported in Node environment');
        }

        if (externalProgramsPaths.libreOfficePath === undefined) {
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
            isCacheCleaned,
            extension: 'docx',
            isVerbose,
        });

        if (isVerbose) {
            console.info(`documentScraper: Converting .${extension} -> .docx`);
        }

        // Note: Running Libreoffice ONLY if the file in the cache does not exist
        if (!(await $isFileExisting(cacheFilehandler.filename))) {
            /**
             * Note: Unfortunately, LibreOffice does not support to specify the output file path,
             *       so we create a subfolder `libreoffice` in the same folder as the source file
             *       and then move the file to the desired location
             */
            const documentSourceOutdirPathForLibreOffice = join(dirname(cacheFilehandler.filename), 'libreoffice')
                .split('\\')
                .join('/');

            const command = `"${externalProgramsPaths.libreOfficePath}" --headless --convert-to docx "${source.filename}"  --outdir "${documentSourceOutdirPathForLibreOffice}"`;

            // TODO: !!!!!! [🕊] Make execCommand standard (?node-)util of the promptbook - this should trigger build polution error
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

            if (!(await $isFileExisting(cacheFilehandler.filename))) {
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
    },

    /**
     * Scrapes the `.doc` or `.rtf` file and returns the knowledge pieces or `null` if it can't scrape it
     */
    async scrape(
        source: ScraperSourceHandler,
        options: PrepareAndScrapeOptions,
    ): Promise<Array<Omit<KnowledgePiecePreparedJson, 'sources' | 'preparationIds'>> | null> {
        const cacheFilehandler = await legacyDocumentScraper.$convert(source, options);

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
            asBlob() {
                throw new UnexpectedError(
                    'Did not expect that `documentScraper` would need to get the content `asBlob`',
                );
            },
        } satisfies ScraperSourceHandler;

        const knowledge = documentScraper.scrape(markdownSource, options);

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
