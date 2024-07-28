import { forEachAsync } from '../../../_packages/utils.index';
import { MAX_PARALLEL_COUNT } from '../../../config';
import { PrepareOptions } from '../../../prepare/PrepareOptions';
import { KnowledgePiecePreparedJson } from '../../../types/PipelineJson/KnowledgePieceJson';
import { KnowledgeSourceJson } from '../../../types/PipelineJson/KnowledgeSourceJson';
import { prepareKnowledgeFromMarkdown } from '../markdown/prepareKnowledgeFromMarkdown';

type PrepareKnowledgeKnowledge = {
    /**
     * Unprepared knowledge
     */
    readonly knowledgeSources: Array<KnowledgeSourceJson>;
};

/**
 * Prepares the knowle
 *
 * @see https://github.com/webgptorg/promptbook/discussions/41
 * @private within the package
 */
export async function prepareKnowledgePieces(
    knowledge: PrepareKnowledgeKnowledge,
    options: PrepareOptions,
): Promise<Array<KnowledgePiecePreparedJson>> {
    const { knowledgeSources } = knowledge;
    const { maxParallelCount = MAX_PARALLEL_COUNT } = options;

    const knowledgePrepared: Array<KnowledgePiecePreparedJson> = [];

    await forEachAsync(knowledgeSources, { maxParallelCount }, async (knowledgeSource) => {
        const partialPiece = await prepareKnowledgeFromMarkdown(
            knowledgeSource.source, // <- TODO: !!!!! Unhardcode markdown
            options,
        );

        const piece = {
            ...partialPiece,
            sources: [
                {
                    name: knowledgeSource.name,
                    // line, column <- TODO: [☀]
                    // <- TODO: [❎]
                },
            ],
        };

        knowledgePrepared.push(piece);
    });

    return knowledgePrepared;
}

/**
 * TODO: !!!! Write tests for `prepareKnowledge`
 * TODO: !!!! Implement `prepareKnowledge`
 * TODO: !!!! Use `prepareKnowledge` in `pipelineStringToJson`
 * TODO: !!!! Use `prepareKnowledge` in `createPipelineExecutor`
 * TODO: [🧊] In future one preparation can take data from previous preparation and save tokens and time
 *       Put `knowledgePieces` into `PrepareKnowledgeOptions`
 * TODO: [🪂] More than max things can run in parallel by acident [1,[2a,2b,_],[3a,3b,_]]
 * TODO: [🧠][❎] Do here propper M:N mapping
 *       [x] One source can make multiple pieces
 *       [ ] One piece can have multiple sources
 */
