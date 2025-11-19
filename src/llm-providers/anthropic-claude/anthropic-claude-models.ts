import type { AvailableModel } from '../../execution/AvailableModel';
import type { number_usd } from '../../types/typeAliases';
import { exportJson } from '../../utils/serialization/exportJson';
import { pricing } from '../_common/utils/pricing';

/**
 * List of available Anthropic Claude models with pricing
 *
 * Note: Synced with official API docs at 2025-11-19
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
            modelTitle: 'Claude Sonnet 4.5',
            modelName: 'claude-sonnet-4-5-20250929',
            modelDescription: 'Our smartest model for complex agents and coding',
            pricing: {
                prompt: pricing(`$3.00 / 1M tokens`),
                output: pricing(`$15.00 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Claude Haiku 4.5',
            modelName: 'claude-haiku-4-5-20251001',
            modelDescription: 'Our fastest model with near-frontier intelligence',
            pricing: {
                prompt: pricing(`$1.00 / 1M tokens`),
                output: pricing(`$5.00 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Claude Opus 4.1',
            modelName: 'claude-opus-4-1-20250805',
            modelDescription:
                'Most powerful and capable Claude model with 200K token context window. Features superior reasoning capabilities, exceptional coding abilities, and advanced multimodal understanding. Sets new standards in complex reasoning and analytical tasks with enhanced safety measures. Ideal for the most demanding enterprise applications requiring maximum intelligence.',
            pricing: {
                prompt: pricing(`$15.00 / 1M tokens`),
                output: pricing(`$75.00 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Claude Opus 4',
            modelName: 'claude-opus-4-20250514',
            modelDescription:
                'Previous flagship Claude model with 200K token context window. Features very high intelligence and capability with exceptional performance across reasoning, coding, and creative tasks. Maintains strong safety guardrails while delivering sophisticated outputs for complex professional applications. DEPRECATED: Use Claude Opus 4.1 instead.',
            pricing: {
                prompt: pricing(`$15.00 / 1M tokens`),
                output: pricing(`$75.00 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Claude Sonnet 4',
            modelName: 'claude-sonnet-4-20250514',
            modelDescription:
                'High-performance Claude model with exceptional reasoning capabilities and 200K token context window (1M context beta available). Features balanced intelligence and efficiency with enhanced multimodal understanding. Offers optimal performance for most enterprise applications requiring sophisticated AI capabilities. DEPRECATED: Use Claude Sonnet 4.5 instead.',
            pricing: {
                prompt: pricing(`$3.00 / 1M tokens`),
                output: pricing(`$15.00 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Claude Sonnet 3.7',
            modelName: 'claude-3-7-sonnet-20250219',
            modelDescription:
                'High-performance Claude model with early extended thinking capabilities and 200K token context window. Features enhanced reasoning chains, improved factual accuracy, and toggleable extended thinking for complex problem-solving. Ideal for applications requiring deep analytical capabilities.',
            pricing: {
                prompt: pricing(`$3.00 / 1M tokens`),
                output: pricing(`$15.00 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Claude Haiku 3.5',
            modelName: 'claude-3-5-haiku-20241022',
            modelDescription:
                'Fastest Claude model with 200K token context window optimized for intelligence at blazing speeds. Features enhanced reasoning and contextual understanding while maintaining sub-second response times. Perfect for real-time applications, customer-facing deployments, and high-throughput services.',
            pricing: {
                prompt: pricing(`$0.80 / 1M tokens`),
                output: pricing(`$4.00 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Claude 3 Opus',
            modelName: 'claude-3-opus-20240229',
            modelDescription:
                'Most sophisticated Claude model with 200K token context window. Excels at complex reasoning, nuanced instruction following, and expert-level problem solving across domains. Features enhanced comprehension of technical content, code generation, and multilingual capabilities. Benchmarks at human expert level on many tasks. Ideal for sensitive enterprise applications requiring highest accuracy.',
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
                'Balanced Claude model with 200K token context window offering excellent performance across reasoning, conversation, coding, and creative tasks. Features strong safety guardrails and 75% reduction in hallucinations compared to Claude 2. Provides optimal balance between intelligence and cost-efficiency for most business applications requiring high-quality outputs.',
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
                'Fastest and most compact Claude model with 200K token context window. Optimized for sub-second response times while maintaining strong reasoning capabilities. Features 2x faster inference than Sonnet with responsive multimodal processing. Ideal for real-time applications, customer-facing deployments, and high-throughput services requiring quick interactions.',
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
                'Improved Claude 2 version with 100K token context window. Features enhanced reasoning, instruction following, and reduced hallucinations. Demonstrates strong capabilities in complex analysis, factual accuracy, and safe content generation. Legacy model maintained for backward compatibility while offering reliable performance for established applications.',
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
                'Legacy model with 100K token context window offering strong general reasoning and language capabilities. Features reliable performance on structured tasks, summarization, and conversational interactions. Superseded by newer Claude 3 models but maintained for compatibility with existing applications and workflows.',
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
                'Older, faster Claude model with 100K context window optimized for high throughput applications. Offers good balance between performance and cost with focus on speed and efficiency. Best suited for simpler tasks, content moderation, and applications where response speed is prioritized over maximum reasoning capability.',
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
                'Latest generation Claude model with 200K token context window featuring dramatically improved reasoning chains, domain expertise, and reduced hallucination rates. Incorporates advanced retrieval-augmented generation techniques and enhanced tool use capabilities. Delivers exceptional performance on complex reasoning tasks requiring deep domain knowledge.',
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
                'Fast and efficient Claude 3.5 variant with 200K token context window. Optimized for high-speed inference with 3x performance improvement over Claude 3 Haiku. Features enhanced contextual understanding and reasoning while maintaining speed advantages. Perfect for interactive applications, mobile deployments, and scaled customer-facing services.',
            pricing: {
                prompt: pricing(`$0.25 / 1M tokens`),
                output: pricing(`$1.25 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Claude 3.7 Haiku',
            modelName: 'claude-3-7-haiku-20250115',
            modelDescription:
                'Ultra-fast Claude variant with 200K token context window and near-instantaneous response times. Features improved reasoning with 40% better benchmark performance than 3.5 Haiku while maintaining minimal latency. Balances sophisticated capabilities with extreme efficiency for high-volume applications requiring rapid responses.',
            pricing: {
                prompt: pricing(`$0.20 / 1M tokens`),
                output: pricing(`$1.00 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Claude Embedding',
            modelName: 'claude-embedding-1',
            modelDescription:
                'Specialized text embedding model optimized for semantic search and retrieval applications. Produces 1536-dimensional embedding vectors capturing nuanced semantic relationships. Features strong cross-lingual capabilities and excellent performance on both similarity and retrieval tasks. Ideal for RAG implementations and semantic search systems.',
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
