import type OpenAI from 'openai';
import { PromptbookExecutionError } from '../../../../errors/PromptbookExecutionError';
import type { Prompt } from '../../../../types/Prompt';
import type { PromptResult } from '../../../PromptResult';
import type { PromptResultUsage } from '../../../PromptResult';
import type { UncertainNumber } from '../../../PromptResult';
import { computeUsageCounts } from '../../../utils/computeUsageCounts';
import { uncertainNumber } from '../../../utils/uncertainNumber';
import { OPENAI_MODELS } from './openai-models';

/**
 * Computes the usage of the OpenAI API based on the response from OpenAI
 *
 * @throws {PromptbookExecutionError} If the usage is not defined in the response from OpenAI
 * @private internal util of `OpenAiExecutionTools`
 */
export function computeOpenaiUsage(
    promptContent: Prompt['content'], // <- Note: Intentionally using [] to access type properties to bring jsdoc from Prompt/PromptResult to consumer
    resultContent: PromptResult['content'],
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
            tokensCount: uncertainNumber(rawResponse.usage.completion_tokens),
            ...computeUsageCounts(resultContent),
        },
    };
}
