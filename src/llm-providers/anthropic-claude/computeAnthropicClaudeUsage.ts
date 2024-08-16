import type Anthropic from '@anthropic-ai/sdk';
import type { PartialDeep } from 'type-fest';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { PromptResultUsage } from '../../execution/PromptResultUsage';
import type { UncertainNumber } from '../../execution/UncertainNumber';
import { computeUsageCounts } from '../../execution/utils/computeUsageCounts';
import { uncertainNumber } from '../../execution/utils/uncertainNumber';
import type { Prompt } from '../../types/Prompt';
import { ANTHROPIC_CLAUDE_MODELS } from './anthropic-claude-models';
import './register4';

/**
 * Computes the usage of the Anthropic Claude API based on the response from Anthropic Claude
 *
 * @param promptContent The content of the prompt
 * @param resultContent The content of the result (for embedding prompts or failed prompts pass empty string)
 * @param rawResponse The raw response from Anthropic Claude API
 * @throws {PipelineExecutionError} If the usage is not defined in the response from Anthropic Claude
 * @private internal utility of `AnthropicClaudeExecutionTools`
 */
export function computeAnthropicClaudeUsage(
    promptContent: Prompt['content'], // <- Note: Intentionally using [] to access type properties to bring jsdoc from Prompt/PromptResult to consumer
    resultContent: string,
    rawResponse: PartialDeep<Pick<Anthropic.Messages.Message, 'model' | 'usage'>>,
): PromptResultUsage {
    if (rawResponse.usage === undefined) {
        throw new PipelineExecutionError('The usage is not defined in the response from Anthropic Claude');
    }

    if (rawResponse.usage?.input_tokens === undefined) {
        throw new PipelineExecutionError('In Anthropic Claude response `usage.prompt_tokens` not defined');
    }

    const inputTokens = rawResponse.usage.input_tokens;
    const outputTokens = rawResponse.usage?.output_tokens || 0;

    const modelInfo = ANTHROPIC_CLAUDE_MODELS.find((model) => model.modelName === rawResponse.model);

    let price: UncertainNumber;

    if (modelInfo === undefined || modelInfo.pricing === undefined) {
        price = uncertainNumber();
    } else {
        price = uncertainNumber(inputTokens * modelInfo.pricing.prompt + outputTokens * modelInfo.pricing.output);
    }

    return {
        price,
        input: {
            tokensCount: uncertainNumber(rawResponse.usage.input_tokens),
            ...computeUsageCounts(promptContent),
        },
        output: {
            tokensCount: uncertainNumber(outputTokens),
            ...computeUsageCounts(resultContent),
        },
    };
}

/**
 * TODO: [🤝] DRY Maybe some common abstraction between `computeOpenaiUsage` and `computeAnthropicClaudeUsage`
 */
