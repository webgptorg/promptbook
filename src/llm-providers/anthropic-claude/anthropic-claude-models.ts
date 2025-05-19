import type { AvailableModel } from '../../execution/AvailableModel';
import type { number_usd } from '../../types/typeAliases';
import { exportJson } from '../../utils/serialization/exportJson';
import { pricing } from '../_common/utils/pricing';

/**
 * List of available Anthropic Claude models with pricing
 *
 * Note: Done at 2025-05-06
 *
 * @see https://docs.anthropic.com/en/docs/models-overview
 * @public exported from `@promptbook/anthropic-claude`
 */
export const ANTHROPIC_CLAUDE_MODELS: ReadonlyArray<
    AvailableModel & {
        pricing?: {
            readonly prompt: number_usd;
            readonly output: number_usd;
        };
    }
> = exportJson({
    name: 'ANTHROPIC_CLAUDE_MODELS',
    value: [
        {
            modelVariant: 'CHAT',
            modelTitle: 'Claude 3.5 Sonnet',
            modelName: 'claude-3-5-sonnet-20240620',
            modelDescription:
                'Latest Claude model with great reasoning, coding, and language understanding capabilities. 200K context window. Optimized balance of intelligence and speed.',
            pricing: {
                prompt: pricing(`$2.50 / 1M tokens`),
                output: pricing(`$12.50 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Claude 3 Opus',
            modelName: 'claude-3-opus-20240229',
            modelDescription:
                'Most capable Claude model excelling at complex reasoning, coding, and detailed instruction following. 200K context window. Best for sophisticated tasks requiring nuanced understanding.',
            pricing: {
                prompt: pricing(`$12.00 / 1M tokens`),
                output: pricing(`$60.00 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Claude 3 Sonnet',
            modelName: 'claude-3-sonnet-20240229',
            modelDescription:
                'Strong general-purpose model with excellent performance across reasoning, conversation, and coding tasks. 200K context window. Good balance of intelligence and cost-efficiency.',
            pricing: {
                prompt: pricing(`$3.00 / 1M tokens`),
                output: pricing(`$15.00 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Claude 3 Haiku',
            modelName: '	claude-3-haiku-20240307',
            modelDescription:
                'Fastest and most compact Claude model optimized for responsiveness in interactive applications. 200K context window. Excellent for quick responses and lightweight applications.',
            pricing: {
                prompt: pricing(`$0.25 / 1M tokens`),
                output: pricing(`$1.25 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Claude 2.1',
            modelName: 'claude-2.1',
            modelDescription:
                'Improved version of Claude 2 with better performance across reasoning and truthfulness. 100K context window. Legacy model with strong reliability.',
            pricing: {
                prompt: pricing(`$8.00 / 1M tokens`),
                output: pricing(`$24.00 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Claude 2',
            modelName: 'claude-2.0',
            modelDescription:
                'Legacy model with strong general reasoning and language capabilities. 100K context window. Superseded by newer Claude 3 models.',
            pricing: {
                prompt: pricing(`$8.00 / 1M tokens`),
                output: pricing(`$24.00 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Claude Instant 1.2',
            modelName: 'claude-instant-1.2',
            modelDescription:
                'Older, faster Claude model optimized for high throughput applications. Lower cost but less capable than newer models. 100K context window.',
            pricing: {
                prompt: pricing(`$0.80 / 1M tokens`),
                output: pricing(`$2.40 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Claude 3.7 Sonnet',
            modelName: 'claude-3-7-sonnet-20250219',
            modelDescription:
                'Latest generation Claude model with advanced reasoning and language understanding. Enhanced capabilities over 3.5 with improved domain knowledge. 200K context window.',
            pricing: {
                prompt: pricing(`$2.50 / 1M tokens`),
                output: pricing(`$12.50 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Claude 3.5 Haiku',
            modelName: 'claude-3-5-haiku-20241022',
            modelDescription:
                'Fast and efficient Claude 3.5 variant optimized for speed and cost-effectiveness. Great for interactive applications requiring quick responses. 200K context window.',
            pricing: {
                prompt: pricing(`$0.25 / 1M tokens`),
                output: pricing(`$1.25 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Claude 3.7 Haiku',
            modelName: 'claude-3-7-haiku-20250115',
            modelDescription: 'Ultra-fast Claude variant for lightweight applications',
            pricing: {
                prompt: pricing(`$0.20 / 1M tokens`),
                output: pricing(`$1.00 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Claude Embedding',
            modelName: 'claude-embedding-1',
            modelDescription: 'Model optimized for text embeddings',
            pricing: {
                prompt: pricing(`$0.05 / 1M tokens`),
                output: 0,
            },
        },
        // …add any additional models from https://docs.anthropic.com/en/docs/models-overview…
    ],
});

/**
 * Note: [🤖] Add models of new variant
 * TODO: [🧠][main] !!3 Add embedding models OR Anthropic has only chat+completion models?
 * TODO: [🧠] Some mechanism to propagate unsureness
 * TODO: [🧠][👮‍♀️] Put here more info like description, isVision, trainingDateCutoff, languages, strengths (	Top-level performance, intelligence, fluency, and understanding), contextWindow,...
 * TODO: [🎰] Some mechanism to auto-update available models
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
