import { MAX_PARALLEL_COUNT } from '../../../config';
import { PrepareOptions } from '../../../prepare/PrepareOptions';
import { KnowledgePiecePreparedJson } from '../../../types/PipelineJson/KnowledgePieceJson';
import { KnowledgeSourceJson, KnowledgeSourcePreparedJson } from '../../../types/PipelineJson/KnowledgeSourceJson';
import { prepareKnowledgeFromMarkdown } from '../markdown/prepareKnowledgeFromMarkdown';

type PrepareKnowledgeKnowledge = {
    /**
     * Unprepared knowledge
     */
    readonly knowledgeSources: Array<KnowledgeSourceJson>;
};

type PrepareKnowledgeResult = {
    /**
     * Sources provided in input options with additional information added by the preparation
     */
    knowledgeSources: Array<KnowledgeSourcePreparedJson>;

    /**
     * Knowledge pieces prepared from the sources
     */
    knowledgePieces: Array<KnowledgePiecePreparedJson>;
};

/**
 * Prepares the persona for the pipeline
 *
 * @private within the package
 */
export async function prepareKnowledge(
    knowledge: PrepareKnowledgeKnowledge,
    options: PrepareOptions,
): Promise<PrepareKnowledgeResult> {
    const { knowledgeSources } = knowledge;
    const { llmTools, maxParallelCount = MAX_PARALLEL_COUNT, isVerbose = false } = options;
    const knowledgePrepared = await prepareKnowledgeFromMarkdown(
        'Roses are red, violets are blue, programmers use Promptbook, users too', // <- TODO: !!!!! Unhardcode
        {
            llmTools,
            maxParallelCount,
            isVerbose,
        },
    );

    return {
        ...knowledgeSources,
        ...knowledgePrepared,
    };
}

/**
 * TODO: !!!! Write tests for `prepareKnowledge`
 * TODO: !!!! Implement `prepareKnowledge`
 * TODO: !!!! Use `prepareKnowledge` in `pipelineStringToJson`
 * TODO: !!!! Use `prepareKnowledge` in `createPipelineExecutor`
 * TODO: !!!! [ 🪂] Do it in parallel
 * TODO: [🧊] In future one preparation can take data from previous preparation and save tokens and time
 *       Put `knowledgePieces` into `PrepareKnowledgeOptions`
 */
