import type OpenAI from 'openai';
import { PromptbookExecutionError } from '../../../../errors/PromptbookExecutionError';
import type { PromptResult, PromptResultUsage, UncertainNumber } from '../../../PromptResult';
import { OPENAI_MODELS } from './openai-models';

/**
 * Computes the usage of the OpenAI API based on the response from OpenAI
 *
 * @throws {PromptbookExecutionError} If the usage is not defined in the response from OpenAI
 */
export function computeOpenaiUsage(
    rawResponse: Pick<OpenAI.Chat.Completions.ChatCompletion | OpenAI.Completions.Completion, 'model' | 'usage'>,
): PromptResultUsage {
    if (rawResponse.usage === undefined) {
        throw new PromptbookExecutionError('The usage is not defined in the response from OpenAI');
    }

    if (rawResponse.usage?.prompt_tokens === undefined) {
        throw new PromptbookExecutionError('In OpenAI response `usage.prompt_tokens` not defined');
    }

    if (rawResponse.usage?.completion_tokens === undefined) {
        throw new PromptbookExecutionError('In OpenAI response `usage.completion_tokens` not defined');
    }

    const inputTokens = rawResponse.usage.prompt_tokens;
    const outputTokens = rawResponse.usage.completion_tokens;

    const modelInfo = OPENAI_MODELS.find((model) => model.modelName === rawResponse.model);

    let price: UncertainNumber;

    if (modelInfo === undefined || modelInfo.pricing === undefined) {
        price = 'UNKNOWN';
    } else {
        price = inputTokens * modelInfo.pricing.prompt + outputTokens * modelInfo.pricing.output;
    }

    return {
        price,
        inputTokens,
        outputTokens,
    };
}
