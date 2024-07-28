import { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import { KnowledgePreparedJson } from '../../../types/PipelineJson/KnowledgeJson';
import { KnowledgePiecePreparedJson } from '../../../types/PipelineJson/KnowledgePieceJson';
import { KnowledgeSourcePreparedJson } from '../../../types/PipelineJson/KnowledgeSourceJson';
import { prepareKnowledgeFromMarkdown } from '../markdown/prepareKnowledgeFromMarkdown';

type PrepareKnowledgeOptions = {
    /**
     * Unprepared knowledge
     */
    readonly knowledgeSources: Array<KnowledgeSourceJson>;

    /**
     * The LLM tools to use for the conversion and extraction of knowledge
     *
     * Note: If you want to use multiple LLMs, you can use `joinLlmExecutionTools` to join them first
     */
    readonly llmTools: LlmExecutionTools;

    /**
     * If true, the preaparation of knowledge logs additional information
     *
     * @default false
     */
    readonly isVerbose?: boolean;
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
export async function prepareKnowledge(options: PrepareKnowledgeOptions): Promise<KnowledgePreparedJson> {
    const { knowledge, llmTools, isVerbose } = options;
    const knowledgePrepared = await prepareKnowledgeFromMarkdown({
        content: 'Roses are red, violets are blue, programmers use Promptbook, users too', // <- TODO: !!!!! Unhardcode
        llmTools,
        isVerbose,
    });

    return {
        ...knowledge,
        ...knowledgePrepared,
    };
}

/**
 * TODO: !!!! Write tests for `prepareKnowledge`
 * TODO: !!!! Implement `prepareKnowledge`
 * TODO: !!!! Use `prepareKnowledge` in `pipelineStringToJson`
 * TODO: !!!! Use `prepareKnowledge` in `createPipelineExecutor`
 */
