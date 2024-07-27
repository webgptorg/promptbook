import type OpenAI from 'openai';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { PromptResultUsage } from '../../execution/PromptResult';
import type { UncertainNumber } from '../../execution/PromptResult';
import { computeUsageCounts } from '../../execution/utils/computeUsageCounts';
import { uncertainNumber } from '../../execution/utils/uncertainNumber';
import type { Prompt } from '../../types/Prompt';
import { OPENAI_MODELS } from './openai-models';

/**
 * Computes the usage of the OpenAI API based on the response from OpenAI
 *
 * @param promptContent The content of the prompt
 * @param resultContent The content of the result (for embedding prompts or failed prompts pass empty string)
 * @param rawResponse The raw response from OpenAI API
 * @throws {PipelineExecutionError} If the usage is not defined in the response from OpenAI
 * @private internal util of `OpenAiExecutionTools`
 */
export function computeOpenaiUsage(
    promptContent: Prompt['content'], // <- Note: Intentionally using [] to access type properties to bring jsdoc from Prompt/PromptResult to consumer
    resultContent: string,
    rawResponse: Pick<
        | OpenAI.Chat.Completions.ChatCompletion
        | OpenAI.Completions.Completion
        | OpenAI.Embeddings.CreateEmbeddingResponse,
        'model' | 'usage'
    >,
): PromptResultUsage {
    if (rawResponse.usage === undefined) {
        throw new PipelineExecutionError('The usage is not defined in the response from OpenAI');
    }

    if (rawResponse.usage?.prompt_tokens === undefined) {
        throw new PipelineExecutionError('In OpenAI response `usage.prompt_tokens` not defined');
    }

    const inputTokens = rawResponse.usage.prompt_tokens;
    const outputTokens = (rawResponse as OpenAI.Chat.Completions.ChatCompletion).usage?.completion_tokens || 0;

    const modelInfo = OPENAI_MODELS.find((model) => model.modelName === rawResponse.model);

    let price: UncertainNumber;

    if (modelInfo === undefined || modelInfo.pricing === undefined) {
        price = uncertainNumber();
    } else {
        price = uncertainNumber(inputTokens * modelInfo.pricing.prompt + outputTokens * modelInfo.pricing.output);
    }

    return {
        price,
        input: {
            tokensCount: uncertainNumber(rawResponse.usage.prompt_tokens),
            ...computeUsageCounts(promptContent),
        },
        output: {
            tokensCount: uncertainNumber(outputTokens),
            ...computeUsageCounts(resultContent),
        },
    };
}
