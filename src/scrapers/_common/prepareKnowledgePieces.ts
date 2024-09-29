import spaceTrim from 'spacetrim';
import { SCRAPERS } from '..';
import { isValidFilePath, isValidUrl } from '../../_packages/utils.index';
import { MAX_PARALLEL_COUNT } from '../../config';
import { KnowledgeScrapeError } from '../../errors/KnowledgeScrapeError';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { forEachAsync } from '../../execution/utils/forEachAsync';
import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import type { KnowledgePiecePreparedJson } from '../../types/PipelineJson/KnowledgePieceJson';
import type { KnowledgeSourceJson } from '../../types/PipelineJson/KnowledgeSourceJson';
import { extensionToMimeType } from '../../utils/files/extensionToMimeType';
import { getFileExtension } from '../../utils/files/getFileExtension';
import { markdownScraper } from '../markdown/markdownScraper';
import { ScraperSourceOptions } from './AbstractScraper';

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
    const { maxParallelCount = MAX_PARALLEL_COUNT, filesystemTools } = options;

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

            if (filesystemTools === null) {
                throw new KnowledgeScrapeError('Filesystem tools are required for scraping local files');
            }

            const filePath = knowledgeSource.sourceContent;
            const fileExtension = getFileExtension(filePath);
            const mimeType = extensionToMimeType(fileExtension || '');

            // TODO: !!!!!! Test security file - file is scoped to the project (maybe do this in `filesystemTools`)

            const scraperSourceOptions = {
                source: knowledgeSource.name, // <- TODO: !!!!!! What should be here `knowledgeSource.name` or `filePath`
                filePath,
                url: null,
                mimeType,
                async asText() {
                    return await filesystemTools.getFile(filePath);
                },
                asJson() {
                    throw new NotYetImplementedError('!!!!!!');
                },
                asBlob() {
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
                        ${block(filePath)}

                    `,
                ),
            );
        } else {
            // 1️⃣ `knowledgeSource` is just inlined (markdown content) information
            const partialPiecesUnchecked = await markdownScraper.scrape(
                {
                    source: knowledgeSource.name,
                    filePath: null,
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
