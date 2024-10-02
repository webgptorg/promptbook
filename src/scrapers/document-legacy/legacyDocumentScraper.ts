import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import type { KnowledgePiecePreparedJson } from '../../types/PipelineJson/KnowledgePieceJson';
import type { AbstractScraper, ScraperSourceOptions } from '../_common/AbstractScraper';
// TODO: [🏳‍🌈] Finally take pick of .json vs .ts
// import PipelineCollection from '../../../promptbook-collection/promptbook-collection';
import { mkdir, readdir, rename, rm, rmdir } from 'fs/promises';
import { basename, dirname, join } from 'path';
import { IS_VERBOSE, SCRAPE_CACHE_DIRNAME } from '../../config';
import { KnowledgeScrapeError } from '../../errors/KnowledgeScrapeError';
import { MissingToolsError } from '../../errors/MissingToolsError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { $isRunningInNode } from '../../utils/environment/$isRunningInNode';
import { execCommand } from '../../utils/execCommand/execCommand';
import { getFileExtension } from '../../utils/files/getFileExtension';
import { documentScraper } from '../document/documentScraper';

/**
 * Scraper for .docx files
 *
 * @see `documentationUrl` for more details
 * @public exported from `@promptbook/core`
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
     * Scrapes the docx file and returns the knowledge pieces or `null` if it can't scrape it
     */
    async scrape(
        source: ScraperSourceOptions,
        options: PrepareAndScrapeOptions,
    ): Promise<Array<Omit<KnowledgePiecePreparedJson, 'sources' | 'preparationIds'>> | null> {
        const {
            externalProgramsPaths = {},
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

        if (source.filePath === null) {
            // TODO: [🧠] Maybe save file as temporary
            throw new KnowledgeScrapeError('When parsing .doc or .rtf file, it must be real file in the file system');
        }

        const extension = getFileExtension(source.filePath);

        const documentSourceFilePath =
            join(process.cwd(), cacheDirname, basename(source.filePath)).split('\\').join('/') + '.docx';

  
        await mkdir(dirname(documentSourceFilePath), { recursive: true });

        if (isVerbose) {
            console.info(`documentScraper: Converting .${extension} -> .docx`);
        }

        /**
         * Note: Unfortunately, LibreOffice does not support to specify the output file path,
         *       so we create a subfolder `libreoffice` in the same folder as the source file
         *       and then move the file to the desired location
         */
        const documentSourceOutdirPathForLibreOffice = join(dirname(documentSourceFilePath), 'libreoffice')
            .split('\\')
            .join('/');

        // TODO: !!!!!! [🕊] Make execCommand standard (?node-)util of the promptbook - this should trigger build polution error
        await execCommand(
            `"${externalProgramsPaths.libreOfficePath}" --headless --convert-to docx "${source.filePath}"  --outdir "${documentSourceOutdirPathForLibreOffice}"`,
        );

        const files = await readdir(documentSourceOutdirPathForLibreOffice);

        if (files.length !== 1) {
            throw new UnexpectedError(
                `Expected exactly 1 file in the LibreOffice output directory, got ${files.length}`,
            );
        }

        const file = files[0]!;

        await rename(join(documentSourceOutdirPathForLibreOffice, file), documentSourceFilePath);
        await rmdir(documentSourceOutdirPathForLibreOffice);

        const markdownSource = {
            source: source.source,
            filePath: documentSourceFilePath,
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
        } satisfies ScraperSourceOptions;

        const knowledge = documentScraper.scrape(markdownSource, options);

        if (isCacheCleaned) {
            if (isVerbose) {
                console.info('legacyDocumentScraper: Clening cache');
            }
            await rm(documentSourceFilePath);
        }

        return knowledge;
    },
} /* TODO: [🦷] as const */ satisfies AbstractScraper;

/**
 * TODO: [👣] Converted documents can act as cached items - there is no need to run conversion each time
 * TODO: [🦖] Make some system for putting scrapers to separete packages
 * TODO: [🪂] Do it in parallel 11:11
 * TODO: [🦷] Ideally use `as const satisfies AbstractScraper` BUT this combination throws errors
 * Note: No need to aggregate usage here, it is done by intercepting the llmTools
 */
