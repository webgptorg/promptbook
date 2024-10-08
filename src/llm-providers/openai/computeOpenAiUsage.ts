import type OpenAI from 'openai';
import type { PartialDeep } from 'type-fest';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { PromptResultUsage } from '../../execution/PromptResultUsage';
import type { UncertainNumber } from '../../execution/UncertainNumber';
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
 * @private internal utility of `OpenAiExecutionTools`
 */
export function computeOpenAiUsage(
    promptContent: Prompt['content'], // <- Note: Intentionally using [] to access type properties to bring jsdoc from Prompt/PromptResult to consumer
    resultContent: string,
    rawResponse: PartialDeep<
        Pick<
            | OpenAI.Chat.Completions.ChatCompletion
            | OpenAI.Completions.Completion
            | OpenAI.Embeddings.CreateEmbeddingResponse,
            // !!!!!! | OpenAI.Beta.Threads.Messages.Message,
            'model' | 'usage'
        >
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

/**
 * TODO: [🤝] DRY Maybe some common abstraction between `computeOpenAiUsage` and `computeAnthropicClaudeUsage`
 */
