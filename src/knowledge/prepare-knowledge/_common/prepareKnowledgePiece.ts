import { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import { KnowledgePieceJson, KnowledgePiecePreparedJson } from '../../../types/PipelineJson/KnowledgePieceJson';
import { prepareKnowledgeFromMarkdown } from '../markdown/prepareKnowledgeFromMarkdown';

type PrepareKnowledgePieceOptions = {
    /**
     * Unprepared knowledge piece
     */
    readonly knowledgePiece: KnowledgePieceJson;

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

/**
 * Prepares the persona for the pipeline
 *
 * @private within the package
 */
export async function prepareKnowledgePiece(
    options: PrepareKnowledgePieceOptions,
): Promise<KnowledgePiecePreparedJson> {
    const { knowledgePiece, llmTools, isVerbose } = options;
    const knowledgePiecePrepared = await prepareKnowledgeFromMarkdown({
        content: 'Roses are red, violets are blue, programmers use Promptbook, users too', // <- TODO: !!!!! Unhardcode
        llmTools,
        isVerbose,
    });

    return {
        ...knowledgePiece,
        ...knowledgePiecePrepared,
    };
}

/**
 * TODO: !!!! Rename ACRY KnowledgePiece to just Knowledge
 * TODO: !!!! Write tests for `prepareKnowledgePiece`
 * TODO: !!!! Implement `prepareKnowledgePiece`
 * TODO: !!!! Use `prepareKnowledgePiece` in `pipelineStringToJson`
 * TODO: !!!! Use `prepareKnowledgePiece` in `createPipelineExecutor`
 */
