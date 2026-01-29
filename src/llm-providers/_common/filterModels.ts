import { Promisable } from 'type-fest';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { AvailableModel } from '../../execution/AvailableModel';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { Prompt } from '../../types/Prompt';

/**
 * Creates a wrapper around LlmExecutionTools that only exposes models matching the filter function
 *
 * @param llmTools The original LLM execution tools to wrap
 * @param predicate Function that determines whether a model should be included
 * @returns A new LlmExecutionTools instance with filtered models
 *
 * @public exported from `@promptbook/core`
 */
export function filterModels<TLlmTools extends LlmExecutionTools>(
    llmTools: TLlmTools,
    predicate: (model: AvailableModel) => boolean,
): TLlmTools {
    const filteredTools: TLlmTools = {
        // Keep all properties from the original llmTools
        ...llmTools,

        get title() {
            return `${llmTools.title} (filtered)`;
            // <- TODO: [🧈] Maybe standartize the suffix when wrapping `LlmExecutionTools` up
        },

        get description() {
            return `${llmTools.description} (filtered)`;
            // <- TODO: [🧈] Maybe standartize the suffix when wrapping `LlmExecutionTools` up
        },

        // Override listModels to filter the models
        async listModels(): Promise<ReadonlyArray<AvailableModel>> {
            const originalModels = await llmTools.listModels();

            // Handle both synchronous and Promise return types
            if (originalModels instanceof Promise) {
                return originalModels.then((models) => models.filter(predicate));
            } else {
                return originalModels.filter(predicate);
            }
        },

        checkConfiguration(): Promisable<void> {
            return /* not await */ llmTools.checkConfiguration();
        },
    };

    // Helper function to validate if a model is allowed
    async function isModelAllowed(modelName: string): Promise<boolean> {
        const models = await filteredTools.listModels();
        return models.some((model) => model.modelName === modelName);
    }

    // Override callChatModel if it exists in the original tools
    if (llmTools.callChatModel) {
        filteredTools.callChatModel = async (prompt: Prompt) => {
            const modelName = prompt.modelRequirements?.modelName;

            // If a specific model is requested, check if it's allowed
            if (modelName && !(await isModelAllowed(modelName))) {
                throw new PipelineExecutionError(`Model ${modelName} is not allowed by the filter for chat calls`);
            }

            return llmTools.callChatModel!(prompt);
        };
    }

    // Override callCompletionModel if it exists in the original tools
    if (llmTools.callCompletionModel) {
        filteredTools.callCompletionModel = async (prompt: Prompt) => {
            const modelName = prompt.modelRequirements?.modelName;

            // If a specific model is requested, check if it's allowed
            if (modelName && !(await isModelAllowed(modelName))) {
                throw new PipelineExecutionError(
                    `Model ${modelName} is not allowed by the filter for completion calls`,
                );
            }

            return llmTools.callCompletionModel!(prompt);
        };
    }

    // Override callEmbeddingModel if it exists in the original tools
    if (llmTools.callEmbeddingModel) {
        filteredTools.callEmbeddingModel = async (prompt: Prompt) => {
            const modelName = prompt.modelRequirements?.modelName;

            // If a specific model is requested, check if it's allowed
            if (modelName && !(await isModelAllowed(modelName))) {
                throw new PipelineExecutionError(`Model ${modelName} is not allowed by the filter for embedding calls`);
            }

            return llmTools.callEmbeddingModel!(prompt);
        };
    }

    return filteredTools;
}
