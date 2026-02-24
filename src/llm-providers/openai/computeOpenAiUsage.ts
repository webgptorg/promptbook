import type OpenAI from 'openai';
import type { PartialDeep } from 'type-fest';
import { SALT_NONCE } from '../../constants';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { UncertainNumber } from '../../execution/UncertainNumber';
import type { Usage } from '../../execution/Usage';
import { computeUsageCounts } from '../../execution/utils/computeUsageCounts';
import { uncertainNumber } from '../../execution/utils/uncertainNumber';
import { ZERO_VALUE } from '../../execution/utils/usage-constants';
import type { Prompt } from '../../types/Prompt';
import { OPENAI_MODELS } from './openai-models';

/**
 * Computes the usage of the OpenAI API based on the response from OpenAI
 *
 * @param promptContent The content of the prompt
 * @param resultContent The content of the result (for embedding prompts or failed prompts pass empty string)
 * @param rawResponse The raw response from OpenAI API
 * @param duration The duration of the execution
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
            // [🗯] | OpenAI.Beta.Threads.Messages.Message,
            'model' | 'usage'
        >
    >,
    duration: UncertainNumber = ZERO_VALUE,
): Usage {
    if (rawResponse.usage === undefined) {
        throw new PipelineExecutionError('The usage is not defined in the response from OpenAI');
    }

    if (rawResponse.usage?.prompt_tokens === undefined) {
        throw new PipelineExecutionError('In OpenAI response `usage.prompt_tokens` not defined');
    }

    const inputTokens = rawResponse.usage.prompt_tokens;
    const outputTokens = (rawResponse as OpenAI.Chat.Completions.ChatCompletion).usage?.completion_tokens || 0;

    let isUncertain = false;
    let modelInfo = OPENAI_MODELS.find((model) => model.modelName === rawResponse.model);

    if (modelInfo === undefined) {
        // Note: Model is not in the list of known models, fallback to the family of the models and mark price as uncertain
        modelInfo = OPENAI_MODELS.find((model) => (rawResponse.model || SALT_NONCE).startsWith(model.modelName));
        if (modelInfo !== undefined) {
            isUncertain = true;
        }
    }

    let price: UncertainNumber;

    if (modelInfo === undefined || modelInfo.pricing === undefined) {
        price = uncertainNumber();
    } else {
        price = uncertainNumber(
            inputTokens * modelInfo.pricing.prompt + outputTokens * modelInfo.pricing.output,
            isUncertain,
        );
    }

    return {
        price,
        duration,
        input: {
            tokensCount: uncertainNumber(rawResponse.usage.prompt_tokens),
            ...computeUsageCounts(
                promptContent,

                // <- TODO: [🕘][🙀] What about system message
            ),
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
