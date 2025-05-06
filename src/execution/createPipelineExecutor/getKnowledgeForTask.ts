import type { ReadonlyDeep } from 'type-fest';
import { assertsError } from '../../errors/assertsError';
import { joinLlmExecutionTools } from '../../llm-providers/multiple/joinLlmExecutionTools';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { TaskJson } from '../../pipeline/PipelineJson/TaskJson';
import type { Prompt } from '../../types/Prompt';
import type { Parameters } from '../../types/typeAliases';
import type { string_markdown } from '../../types/typeAliases';
import type { string_parameter_value } from '../../types/typeAliases';
import { arrayableToArray } from '../../utils/arrayableToArray';
import type { ExecutionTools } from '../ExecutionTools';
import { computeCosineSimilarity } from './computeCosineSimilarity';
import { knowledgePiecesToString } from './knowledgePiecesToString';

/**
 * Options for retrieving relevant knowledge for a specific task during pipeline execution.
 *
 * @private internal type of `getKnowledgeForTask`
 */
type GetKnowledgeForTaskOptions = {
    /**
     * The execution tools to be used during the execution of the pipeline.
     */
    readonly tools: ExecutionTools;

    /**
     * The fully prepared pipeline containing all tasks and knowledge pieces.
     */
    readonly preparedPipeline: ReadonlyDeep<PipelineJson>;

    /**
     * The current task for which knowledge is being retrieved.
     */
    readonly task: ReadonlyDeep<TaskJson>;
    //       <- TODO: [🕉] `task` vs `currentTask` - unite naming

    /**
     * Parameters used to complete the content of the task for embedding and knowledge retrieval.
     */
    readonly parameters: Readonly<Parameters>;
};

/**
 * Retrieves the most relevant knowledge pieces for a given task using embedding-based similarity search.
 * This is where retrieval-augmented generation (RAG) is performed to enhance the task with external knowledge.
 *
 * @private internal utility of `createPipelineExecutor`
 */
export async function getKnowledgeForTask(
    options: GetKnowledgeForTaskOptions,
): Promise<string_parameter_value & string_markdown> {
    const { tools, preparedPipeline, task, parameters } = options;

    const firstKnowlegePiece = preparedPipeline.knowledgePieces[0];
    const firstKnowlegeIndex = firstKnowlegePiece?.index[0];
    // <- TODO: Do not use just first knowledge piece and first index to determine embedding model, use also keyword search

    if (firstKnowlegePiece === undefined || firstKnowlegeIndex === undefined) {
        return ''; // <- Note: Np knowledge present, return empty string
    }

    try {
        // TODO: [🚐] Make arrayable LLMs -> single LLM DRY
        const _llms = arrayableToArray(tools.llm);
        const llmTools = _llms.length === 1 ? _llms[0]! : joinLlmExecutionTools(..._llms);

        const taskEmbeddingPrompt = {
            title: 'Knowledge Search',
            modelRequirements: {
                modelVariant: 'EMBEDDING',
                modelName: firstKnowlegeIndex.modelName,
            },
            content: task.content,
            parameters,
        } as const satisfies Prompt;
        const taskEmbeddingResult = await llmTools.callEmbeddingModel!(taskEmbeddingPrompt);

        const knowledgePiecesWithRelevance = preparedPipeline.knowledgePieces.map((knowledgePiece) => {
            const { index } = knowledgePiece;

            const knowledgePieceIndex = index.find((i) => i.modelName === firstKnowlegeIndex.modelName);
            // <- TODO: Do not use just first knowledge piece and first index to determine embedding model

            if (knowledgePieceIndex === undefined) {
                return {
                    content: knowledgePiece.content,
                    relevance: 0,
                };
            }

            const relevance = computeCosineSimilarity(knowledgePieceIndex.position, taskEmbeddingResult.content);

            return {
                content: knowledgePiece.content,
                relevance,
            };
        });

        const knowledgePiecesSorted = knowledgePiecesWithRelevance.sort((a, b) => a.relevance - b.relevance);
        const knowledgePiecesLimited = knowledgePiecesSorted.slice(
            0,
            5,
            // <- TODO: Number of knowledge pieces to return determined by the task and used model
        );

        console.log('!!! Embedding', {
            task,
            taskEmbeddingPrompt,
            taskEmbeddingResult,
            firstKnowlegePiece,
            firstKnowlegeIndex,
            knowledgePiecesWithRelevance,
            knowledgePiecesSorted,
            knowledgePiecesLimited,
        });

        return knowledgePiecesToString(knowledgePiecesLimited);
    } catch (error) {
        assertsError(error);

        console.error('Error in `getKnowledgeForTask`', error);

        // Note: If the LLM fails, just return all knowledge pieces
        return knowledgePiecesToString(preparedPipeline.knowledgePieces);
    }
}

/**
 * TODO: !!!! Verify if this is working
 * TODO: [♨] Implement Better - use keyword search
 * TODO: [♨] Examples of values
 */
