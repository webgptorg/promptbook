import { number_usd } from '../../../../types/typeAliases';
import type { AvailableModel } from '../../../LlmExecutionTools';
import { computeUsage } from '../openai/computeUsage';

/**
 * List of available Anthropic Claude models with pricing
 *
 * Note: Done at 2024-05-25
 *
 * @see https://docs.anthropic.com/en/docs/models-overview
 */
export const ANTHROPIC_CLAUDE_MODELS: Array<
    AvailableModel & {
        pricing?: {
            prompt: number_usd;
            output: number_usd;
        };
    }
> = [
    {
        modelVariant: 'CHAT',
        modelTitle: 'Claude 3 Opus',
        modelName: 'claude-3-opus', // <- TODO: [🙌] Maybe include full model name like `claude-3-opus-20240229`
        pricing: {
            prompt: computeUsage(`$15.00 / 1M tokens`),
            output: computeUsage(`$75.00 / 1M tokens`),
        },
    },
    {
        modelVariant: 'CHAT',
        modelTitle: 'Claude 3 Sonnet',
        modelName: 'claude-3-sonnet', // <- TODO: [🙌] Maybe include full model name like `claude-3-sonnet-20240229`
        pricing: {
            prompt: computeUsage(`$3.00 / 1M tokens`),
            output: computeUsage(`$15.00 / 1M tokens`),
        },
    },
    {
        modelVariant: 'CHAT',
        modelTitle: 'Claude 3 Haiku',
        modelName: '	claude-3-haiku', // <- TODO: [🙌] Maybe include full model name like `	claude-3-haiku-20240307`
        pricing: {
            prompt: computeUsage(`$0.25 / 1M tokens`),
            output: computeUsage(`$1.25 / 1M tokens`),
        },
    },
    {
        modelVariant: 'CHAT',
        modelTitle: 'Claude 2.1',
        modelName: 'claude-2.1',
        pricing: {
            prompt: computeUsage(`$8.00 / 1M tokens`),
            output: computeUsage(`$24.00 / 1M tokens`),
        },
    },
    {
        modelVariant: 'CHAT',
        modelTitle: 'Claude 2',
        modelName: 'claude-2.0',
        pricing: {
            prompt: computeUsage(`$8.00 / 1M tokens`),
            output: computeUsage(`$24.00 / 1M tokens`),
        },
    },
    {
        modelVariant: 'CHAT',
        modelTitle: '	Claude Instant 1.2',
        modelName: 'claude-instant-1.2',
        pricing: {
            prompt: computeUsage(`$0.80 / 1M tokens`),
            output: computeUsage(`$2.40 / 1M tokens`),
        },
    },

    // TODO: !!! Claude 1 and 2 has also completion versions - ask Hoagy
];

/**
 * TODO: [🧠] Some mechanism to propagate unsureness
 * TODO: [🧠][👮‍♀️] Put here more info like description, isVision, trainingDateCutoff, languages, strengths (	Top-level performance, intelligence, fluency, and understanding), contextWindow,...
 * TODO: [🕚] Make this list dynamic - dynamically can be listed modelNames but not modelVariant, legacy status, context length and pricing
 */
