import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import type { KnowledgePiecePreparedJson } from '../../types/PipelineJson/KnowledgePieceJson';
import type { Scraper, ScraperSourceOptions } from '../_common/Scraper';
// TODO: [🏳‍🌈] Finally take pick of .json vs .ts
// import PipelineCollection from '../../../promptbook-collection/promptbook-collection';
import { mkdir, readFile, rm } from 'fs/promises';
import { basename, dirname, join } from 'path';
import { IS_VERBOSE, SCRAPE_CACHE_DIRNAME } from '../../config';
import { KnowledgeScrapeError } from '../../errors/KnowledgeScrapeError';
import { MissingToolsError } from '../../errors/MissingToolsError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { $isRunningInNode } from '../../utils/environment/$isRunningInNode';
import { execCommand } from '../../utils/execCommand/execCommand';
import { getFileExtension } from '../../utils/files/getFileExtension';
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
            throw new KnowledgeScrapeError('Scraping .docx files is only supported in Node environment');
        }

        if (externalProgramsPaths.pandocPath === undefined) {
            throw new MissingToolsError('Pandoc is required for scraping .docx files');
        }

        if (source.filePath === null) {
            // TODO: [🧠] Maybe save file as temporary
            throw new KnowledgeScrapeError('When parsing .docx file, it must be real file in the file system');
        }

        const extension = getFileExtension(source.filePath);

        const markdownSourceFilePath =
            join(process.cwd(), cacheDirname, basename(source.filePath)).split('\\').join('/') + '.md';

        await mkdir(dirname(markdownSourceFilePath), { recursive: true });

        if (isVerbose) {
            console.info(`documentScraper: Converting .${extension} -> .md`);
        }

        // TODO: !!!!!! [🕊] Make execCommand standard (?node-)util of the promptbook
        await execCommand(
            `"${externalProgramsPaths.pandocPath}" -f ${extension} -t markdown "${source.filePath}" -o "${markdownSourceFilePath}"`,
        );

        const markdownSource = {
            source: source.source,
            filePath: markdownSourceFilePath,
            url: null,
            mimeType: 'text/markdown',
            async asText() {
                return await readFile(markdownSourceFilePath, 'utf-8');
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
        } satisfies ScraperSourceOptions;

        const knowledge = markdownScraper.scrape(markdownSource, options);

        if (isCacheCleaned) {
            if (isVerbose) {
                console.info('documentScraper: Clening cache');
            }
            await rm(markdownSourceFilePath);
        }

        return knowledge;
    },
} /* TODO: [🦷] as const */ satisfies Scraper;

/**
 * TODO: [👣] Converted documents can act as cached items - there is no need to run conversion each time
 * TODO: [🦖] Make some system for putting scrapers to separete packages
 * TODO: [🪂] Do it in parallel 11:11
 * TODO: [🦷] Ideally use `as const satisfies Scraper` BUT this combination throws errors
 * Note: No need to aggregate usage here, it is done by intercepting the llmTools
 */
