import { MAX_PARALLEL_COUNT } from '../../../config';
import { forEachAsync } from '../../../execution/utils/forEachAsync';
import type { PrepareOptions } from '../../../prepare/PrepareOptions';
import type { KnowledgePiecePreparedJson } from '../../../types/PipelineJson/KnowledgePieceJson';
import type { KnowledgeSourceJson } from '../../../types/PipelineJson/KnowledgeSourceJson';
import { prepareKnowledgeFromMarkdown } from '../markdown/prepareKnowledgeFromMarkdown';

/**
 * Prepares the knowle
 *
 * @see https://github.com/webgptorg/promptbook/discussions/41
 * @public exported from `@promptbook/core`
 */
export async function prepareKnowledgePieces(
    knowledgeSources: Array<KnowledgeSourceJson>,
    options: PrepareOptions,
): Promise<Array<Omit<KnowledgePiecePreparedJson, 'preparationIds'>>> {
    const { maxParallelCount = MAX_PARALLEL_COUNT } = options;

    const knowledgePrepared: Array<Omit<KnowledgePiecePreparedJson, 'preparationIds'>> = [];

    await forEachAsync(knowledgeSources, { maxParallelCount }, async (knowledgeSource) => {
        const partialPieces = await prepareKnowledgeFromMarkdown(
            knowledgeSource.source, // <- TODO: [🐝] !!! Unhardcode markdown, detect which type it is - BE AWARE of big package size
            options,
        );

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
>   options: PrepareOptions,
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
