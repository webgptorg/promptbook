import type OpenAI from 'openai';
import type { PromptResult } from '../../../PromptResult';

export function computeOpenaiUsage(
    rawResponse: Pick<OpenAI.Chat.Completions.ChatCompletion | OpenAI.Completions.Completion, 'model' | 'usage'>,
): PromptResult['usage'] {
    if (rawResponse.usage === undefined) {
        throw new Error('The usage is not defined in the response from OpenAPI');
    }

    if (rawResponse.usage?.prompt_tokens === undefined) {
        throw new Error('In OpenAPI response `usage.prompt_tokens` not defined');
    }

    if (rawResponse.usage?.completion_tokens === undefined) {
        throw new Error('In OpenAPI response `usage.completion_tokens` not defined');
    }

    const inputTokens = rawResponse.usage.prompt_tokens;
    const outputTokens = rawResponse.usage.completion_tokens;

    const pricePerToken = {
        'gpt-3.5-turbo-1106': {
            prompt: 0.001 / 1000,
            completion: 0.002 / 1000,
        },
        'gpt-4-1106-preview': {
            prompt: 0.01 / 1000,
            completion: 0.03 / 1000,
        },
        'gpt-4': {
            prompt: 0.03 / 1000,
            completion: 0.06 / 1000,
        },
    }[rawResponse.model];

    let price: PromptResult['usage']['price'];

    if (pricePerToken === undefined) {
        price = 'UNKNOWN';
    } else {
        price = inputTokens * pricePerToken.prompt + outputTokens * pricePerToken.completion;
    }

    return {
        price,
        inputTokens,
        outputTokens,
    };
}
