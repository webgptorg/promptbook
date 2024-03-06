import type OpenAI from 'openai';
import type { PromptResult } from '../../../PromptResult';

export function computeOpenaiUsage(
    rawResponse: Pick<OpenAI.Chat.Completions.ChatCompletion | OpenAI.Completions.Completion, 'model' | 'usage'>,
): PromptResult['usage'] {
    if (rawResponse.usage === undefined) {
        throw new Error('The usage is not defined in the response from OpenAI');
    }

    if (rawResponse.usage?.prompt_tokens === undefined) {
        throw new Error('In OpenAI response `usage.prompt_tokens` not defined');
    }

    if (rawResponse.usage?.completion_tokens === undefined) {
        throw new Error('In OpenAI response `usage.completion_tokens` not defined');
    }

    const inputTokens = rawResponse.usage.prompt_tokens;
    const outputTokens = rawResponse.usage.completion_tokens;

    const pricePerThousandTokens = {
        'gpt-3.5-turbo-0613': {
            prompt: 0.0015,
            completion: 0.002,
        },
        'gpt-4-0613': {
            // TODO: Not sure if this is correct
            prompt: 0.01,
            completion: 0.03,
        },
        'gpt-3.5-turbo-instruct': {
            prompt: 0.0015,
            completion: 0.002,
        },
        'gpt-4-0125-preview': {
            prompt: 0.01,
            completion: 0.03,
        },
    }[rawResponse.model];

    let price: PromptResult['usage']['price'];

    if (pricePerThousandTokens === undefined) {
        price = 'UNKNOWN';
    } else {
        price = (inputTokens * pricePerThousandTokens.prompt + outputTokens * pricePerThousandTokens.completion) / 1000;
    }

    return {
        price,
        inputTokens,
        outputTokens,
    };
}
