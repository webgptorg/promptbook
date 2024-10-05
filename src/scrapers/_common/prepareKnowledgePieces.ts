import spaceTrim from 'spacetrim';
import { MAX_PARALLEL_COUNT } from '../../config';
import { KnowledgeScrapeError } from '../../errors/KnowledgeScrapeError';
import { forEachAsync } from '../../execution/utils/forEachAsync';
import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';
import type { KnowledgePiecePreparedJson } from '../../types/PipelineJson/KnowledgePieceJson';
import type { KnowledgeSourceJson } from '../../types/PipelineJson/KnowledgeSourceJson';
import { SCRAPERS } from '../index';
import { sourceContentToSourceOptions } from './utils/sourceContentToSourceOptions';

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
        let partialPieces: Omit<KnowledgePiecePreparedJson, 'preparationIds' | 'sources'>[] | null = null;
        const sourceOptions = await sourceContentToSourceOptions(knowledgeSource);

        for (const scraper of SCRAPERS) {
            if (
                !scraper.mimeTypes.includes(sourceOptions.mimeType)
                // <- TODO: [🦔] Implement mime-type wildcards
            ) {
                continue;
            }

            const partialPiecesUnchecked = await scraper.scrape(sourceOptions, options);

            if (partialPiecesUnchecked !== null) {
                partialPieces = partialPiecesUnchecked;
                break;
            }
        }

        if (partialPieces === null) {
            throw new KnowledgeScrapeError(
                spaceTrim(
                    (block) => `
                        Cannot scrape knowledge from source: ${knowledgeSource.sourceContent}

                        No scraper found for the ${sourceOptions.mimeType}

                        Available scrapers:
                        ${block(
                            SCRAPERS.flatMap((scraper) => scraper.mimeTypes)
                                .map((mimeType) => `- ${mimeType}`)
                                .join('\n'),
                        )}


                    `,
                ),
            );
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
