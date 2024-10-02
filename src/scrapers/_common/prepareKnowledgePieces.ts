import { readFile } from 'fs/promises'; // <- TODO: !!!!!! is it OK to import from `fs/promises` in browser environment?
import spaceTrim from 'spacetrim';
import { $isRunningInNode } from '../../_packages/utils.index';
import { MAX_PARALLEL_COUNT } from '../../config';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import { KnowledgeScrapeError } from '../../errors/KnowledgeScrapeError';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { forEachAsync } from '../../execution/utils/forEachAsync';
import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import type { KnowledgePiecePreparedJson } from '../../types/PipelineJson/KnowledgePieceJson';
import type { KnowledgeSourceJson } from '../../types/PipelineJson/KnowledgeSourceJson';
import { extensionToMimeType } from '../../utils/files/extensionToMimeType';
import { getFileExtension } from '../../utils/files/getFileExtension';
import { isValidFilePath } from '../../utils/validators/filePath/isValidFilePath';
import { isValidUrl } from '../../utils/validators/url/isValidUrl';
import { SCRAPERS } from '../index';
import { markdownScraper } from '../markdown/markdownScraper';
import type { ScraperSourceOptions } from './Scraper';

/**
 * Prepares the knowle
 *
 * @see https://github.com/webgptorg/promptbook/discussions/41
 * @public exported from `@promptbook/core`
 */
export async function prepareKnowledgePieces(
    knowledgeSources: Array<KnowledgeSourceJson>,
    options: PrepareAndScrapeOptions,
): Promise<Array<Omit<KnowledgePiecePreparedJson, 'preparationIds'>>> {
    const { maxParallelCount = MAX_PARALLEL_COUNT, rootDirname } = options;

    const knowledgePrepared: Array<Omit<KnowledgePiecePreparedJson, 'preparationIds'>> = [];

    await forEachAsync(knowledgeSources, { maxParallelCount }, async (knowledgeSource) => {
        let partialPieces: Omit<KnowledgePiecePreparedJson, 'preparationIds' | 'sources'>[];

        if (isValidUrl(knowledgeSource.sourceContent)) {
            // 1️⃣ `knowledgeSource` is URL
            // [3] DRY 1️⃣ and 2️⃣

            throw new NotYetImplementedError('TODO: !!!!!! Implement knowledgeSource URL scraping');
        } else if (isValidFilePath(knowledgeSource.sourceContent)) {
            // 2️⃣ `knowledgeSource` is local file path
            // [3] DRY 1️⃣ and 2️⃣

            if (!$isRunningInNode()) {
                throw new EnvironmentMismatchError('Importing knowledge source file works only in Node.js environment');
            }

            const filename = knowledgeSource.sourceContent;
            const fileExtension = getFileExtension(filename);
            const mimeType = extensionToMimeType(fileExtension || '');

            // TODO: !!!!!! Test that file exists and is accessible
            // TODO: !!!!!! Test security file - file is scoped to the project (maybe do this in `filesystemTools`)

            const scraperSourceOptions = {
                source: knowledgeSource.name, // <- TODO: !!!!!! What should be here `knowledgeSource.name` or `filename`
                filename,
                url: null,
                mimeType,
                async asText() {
                    return await readFile(filename, 'utf-8');
                },
                async asJson() {
                    return JSON.parse(await readFile(filename, 'utf-8'));
                },
                async asBlob() {
                    throw new NotYetImplementedError('!!!!!!');
                },
            } satisfies ScraperSourceOptions;

            for (const scraper of SCRAPERS) {
                if (
                    !scraper.mimeTypes.includes(mimeType)
                    // <- TODO: [🦔] Implement mime-type wildcards
                ) {
                    continue;
                }

                const partialPiecesUnchecked = await scraper.scrape(scraperSourceOptions, options);

                if (partialPiecesUnchecked !== null) {
                    partialPieces = partialPiecesUnchecked;
                    break;
                }
            }

            throw new KnowledgeScrapeError(
                spaceTrim(
                    (block) => `
                        Can not find scraper the "${mimeType}" file

                        File Extension:
                        ${block(fileExtension || 'null')}

                        File path:
                        ${block(filename)}

                    `,
                ),
            );
        } else {
            // 1️⃣ `knowledgeSource` is just inlined (markdown content) information
            const partialPiecesUnchecked = await markdownScraper.scrape(
                {
                    source: knowledgeSource.name,
                    filename: null,
                    url: null,
                    mimeType: 'text/markdown',
                    asText() {
                        return knowledgeSource.sourceContent;
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
                },
                options,
            );

            if (partialPiecesUnchecked === null) {
                throw new UnexpectedError('Did not expect that `markdownScraper` would return `null`');
            }

            partialPieces = partialPiecesUnchecked;
        }

        const pieces = partialPieces.map((partialPiece) => ({
            ...partialPiece,
            sources: [
                {
                    name: knowledgeSource.name,
                    // line, column <- TODO: [☀]
                    // <- TODO: [❎]
                },
            ],
        }));

        knowledgePrepared.push(...pieces);
    });

    return knowledgePrepared;
}

/*
TODO: [🧊] This is how it can look in future
> type PrepareKnowledgeKnowledge = {
>   /**
>    * Unprepared knowledge
>    * /
>   readonly knowledgeSources: Array<KnowledgeSourceJson>;
> };
>
> export async function prepareKnowledgePieces(
>   knowledge: PrepareKnowledgeKnowledge,
>   options: PrepareAndScrapeOptions,
> ):
*/

/**
 * TODO: [🧊] In future one preparation can take data from previous preparation and save tokens and time
 *       Put `knowledgePieces` into `PrepareKnowledgeOptions`
 * TODO: [🪂] More than max things can run in parallel by acident [1,[2a,2b,_],[3a,3b,_]]
 * TODO: [🧠][❎] Do here propper M:N mapping
 *       [x] One source can make multiple pieces
 *       [ ] One piece can have multiple sources
 */
