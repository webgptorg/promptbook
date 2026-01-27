import spaceTrim from 'spacetrim';
import { DEFAULT_IS_VERBOSE, DEFAULT_MAX_PARALLEL_COUNT } from '../../config';
import { KnowledgeScrapeError } from '../../errors/KnowledgeScrapeError';
import { forEachAsync } from '../../execution/utils/forEachAsync';
import type { KnowledgePiecePreparedJson } from '../../pipeline/PipelineJson/KnowledgePieceJson';
import type { KnowledgeSourceJson } from '../../pipeline/PipelineJson/KnowledgeSourceJson';
import type { PrepareAndScrapeOptions } from '../../prepare/PrepareAndScrapeOptions';

import { assertsError } from '../../errors/assertsError';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import { arrayableToArray } from '../../utils/misc/arrayableToArray';
import { $registeredScrapersMessage } from './register/$registeredScrapersMessage';
import { makeKnowledgeSourceHandler } from './utils/makeKnowledgeSourceHandler';

/**
 * Prepares the knowledge pieces
 *
 * @see https://github.com/webgptorg/promptbook/discussions/41
 * @public exported from `@promptbook/core`
 */
export async function prepareKnowledgePieces(
    knowledgeSources: ReadonlyArray<KnowledgeSourceJson>,
    tools: Pick<ExecutionTools, 'llm' | 'fs' | 'scrapers'>,
    options: PrepareAndScrapeOptions,
): Promise<ReadonlyArray<Omit<KnowledgePiecePreparedJson, 'preparationIds'>>> {
    const { maxParallelCount = DEFAULT_MAX_PARALLEL_COUNT, rootDirname, isVerbose = DEFAULT_IS_VERBOSE } = options;

    const knowledgePreparedUnflatten: Array<Array<Omit<KnowledgePiecePreparedJson, 'preparationIds'>>> = new Array(
        knowledgeSources.length,
    );

    await forEachAsync(knowledgeSources, { maxParallelCount }, async (knowledgeSource, index) => {
        try {
            let partialPieces: Omit<KnowledgePiecePreparedJson, 'preparationIds' | 'sources'>[] | null = null;
            const sourceHandler = await makeKnowledgeSourceHandler(knowledgeSource, tools, { rootDirname, isVerbose });
            const scrapers = arrayableToArray(tools.scrapers);

            for (const scraper of scrapers) {
                if (
                    !scraper.metadata.mimeTypes.includes(sourceHandler.mimeType)
                    // <- TODO: [🦔] Implement mime-type wildcards
                ) {
                    continue;
                }

                const partialPiecesUnchecked = await scraper.scrape(sourceHandler);

                if (partialPiecesUnchecked !== null) {
                    partialPieces = [...partialPiecesUnchecked];
                    // <- TODO: [🪓] Here should be no need for spreading new array, just `partialPieces = partialPiecesUnchecked`

                    break;
                }

                console.warn(
                    spaceTrim(
                        (block) => `
                            Cannot scrape knowledge from source despite the scraper \`${
                                scraper.metadata.className
                            }\` supports the mime type "${sourceHandler.mimeType}".

                            The source:
                            ${block(
                                knowledgeSource.knowledgeSourceContent
                                    .split(/\r?\n/)
                                    .map((line) => `> ${line}`)
                                    .join('\n'),
                            )}

                            ${block($registeredScrapersMessage(scrapers))}


                        `,
                    ),
                );
                // <- TODO: [🏮] Some standard way how to transform errors into warnings and how to handle non-critical fails during the tasks
            }

            if (partialPieces === null) {
                throw new KnowledgeScrapeError(
                    spaceTrim(
                        (block) => `
                            Cannot scrape knowledge

                            The source:
                            > ${block(
                                knowledgeSource.knowledgeSourceContent
                                    .split(/\r?\n/)
                                    .map((line) => `> ${line}`)
                                    .join('\n'),
                            )}

                            No scraper found for the mime type "${sourceHandler.mimeType}"

                            ${block($registeredScrapersMessage(scrapers))}


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

            knowledgePreparedUnflatten[index] = pieces;
        } catch (error) {
            assertsError(error);

            console.warn(error);
            // <- TODO: [🏮] Some standard way how to transform errors into warnings and how to handle non-critical fails during the tasks
        }
    });

    const knowledgePrepared: ReadonlyArray<Omit<KnowledgePiecePreparedJson, 'preparationIds'>> =
        knowledgePreparedUnflatten.flat();

    return knowledgePrepared;
}

/*
TODO: [🧊] This is how it can look in future
> type PrepareKnowledgeKnowledge = {
>   /**
>    * Unprepared knowledge
>    * /
>   readonly knowledgeSources: ReadonlyArray<KnowledgeSourceJson>;
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
 * TODO: [🪂] More than max things can run in parallel by accident [1,[2a,2b,_],[3a,3b,_]]
 * TODO: [🧠][❎] Do here proper M:N mapping
 *       [x] One source can make multiple pieces
 *       [ ] One piece can have multiple sources
 */
