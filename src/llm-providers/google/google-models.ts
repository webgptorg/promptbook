import type { AvailableModel } from '../../execution/AvailableModel';
import type { number_usd } from '../../types/typeAliases';
import { exportJson } from '../../utils/serialization/exportJson';
import { pricing } from '../_common/utils/pricing';

/**
 * List of available Google models with descriptions
 *
 * Note: Done at 2025-05-06
 *
 * @see https://ai.google.dev/models/gemini
 * @public exported from `@promptbook/google`
 */
export const GOOGLE_MODELS: ReadonlyArray<
    AvailableModel & {
        modelDescription?: string;
        pricing?: {
            readonly prompt: number_usd;
            readonly output: number_usd;
        };
    }
> = exportJson({
    name: 'GOOGLE_MODELS',
    value: [
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 2.5 Pro',
            modelName: 'gemini-2.5-pro-preview-03-25',
            modelDescription:
                'Latest advanced multimodal model with exceptional reasoning, tool use, and instruction following. 1M token context window with improved vision capabilities for complex visual tasks.',
            pricing: {
                prompt: pricing(`$8.00 / 1M tokens`),
                output: pricing(`$24.00 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 2.0 Flash',
            modelName: 'gemini-2.0-flash',
            modelDescription:
                'Fast, efficient model optimized for rapid response times. Good balance between performance and cost, with strong capabilities across text, code, and reasoning tasks. 128K context window.',
            pricing: {
                prompt: pricing(`$0.35 / 1M tokens`),
                output: pricing(`$1.05 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 2.0 Flash Lite',
            modelName: 'gemini-2.0-flash-lite',
            modelDescription:
                'Streamlined version of Gemini 2.0 Flash, designed for extremely low-latency applications and edge deployments. Optimized for efficiency while maintaining core capabilities.',
            pricing: {
                prompt: pricing(`$0.20 / 1M tokens`),
                output: pricing(`$0.60 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 2.0 Flash Thinking',
            modelName: 'gemini-2.0-flash-thinking-exp-01-21',
            modelDescription:
                'Experimental model focused on enhanced reasoning with explicit chain-of-thought processes. Designed for tasks requiring structured thinking and problem-solving approaches.',
            pricing: {
                prompt: pricing(`$0.35 / 1M tokens`),
                output: pricing(`$1.05 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 1.5 Flash',
            modelName: 'gemini-1.5-flash',
            modelDescription:
                'Efficient model balancing speed and quality for general-purpose applications. 1M token context window with good multimodal capabilities and quick response times.',
            pricing: {
                prompt: pricing(`$0.25 / 1M tokens`),
                output: pricing(`$0.75 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 1.5 Flash Latest',
            modelName: 'gemini-1.5-flash-latest',
            modelDescription:
                'Points to the latest version of Gemini 1.5 Flash, ensuring access to the most recent improvements and bug fixes while maintaining stable interfaces.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 1.5 Flash 001',
            modelName: 'gemini-1.5-flash-001',
            modelDescription:
                'First stable release of Gemini 1.5 Flash model with reliable performance characteristics for production applications. 1M token context window.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 1.5 Flash 002',
            modelName: 'gemini-1.5-flash-002',
            modelDescription:
                'Improved version of Gemini 1.5 Flash with enhanced instruction following and more consistent outputs. Refined for better application integration.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 1.5 Flash Exp',
            modelName: 'gemini-1.5-flash-exp-0827',
            modelDescription:
                'Experimental version of Gemini 1.5 Flash with new capabilities being tested. May offer improved performance but with potential behavior differences from stable releases.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 1.5 Flash 8B',
            modelName: 'gemini-1.5-flash-8b',
            modelDescription:
                'Compact 8B parameter model optimized for efficiency and deployment in resource-constrained environments. Good performance despite smaller size.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 1.5 Flash 8B Latest',
            modelName: 'gemini-1.5-flash-8b-latest',
            modelDescription:
                'Points to the most recent version of the compact 8B parameter model, providing latest improvements while maintaining a small footprint.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 1.5 Flash 8B Exp',
            modelName: 'gemini-1.5-flash-8b-exp-0924',
            modelDescription:
                'Experimental version of the 8B parameter model with new capabilities and optimizations being evaluated for future stable releases.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 1.5 Flash 8B Exp',
            modelName: 'gemini-1.5-flash-8b-exp-0827',
            modelDescription:
                'August experimental release of the efficient 8B parameter model with specific improvements to reasoning capabilities and response quality.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 1.5 Pro Latest',
            modelName: 'gemini-1.5-pro-latest',
            modelDescription:
                'Points to the most recent version of the flagship Gemini 1.5 Pro model, ensuring access to the latest capabilities and improvements.',
            pricing: {
                prompt: pricing(`$7.00 / 1M tokens`),
                output: pricing(`$21.00 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 1.5 Pro',
            modelName: 'gemini-1.5-pro',
            modelDescription:
                'Flagship multimodal model with strong performance across text, code, vision, and audio tasks. 1M token context window with excellent reasoning capabilities.',
            pricing: {
                prompt: pricing(`$6.00 / 1M tokens`),
                output: pricing(`$18.00 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 1.5 Pro 001',
            modelName: 'gemini-1.5-pro-001',
            modelDescription:
                'First stable release of Gemini 1.5 Pro with consistent performance characteristics and reliable behavior for production applications.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 1.5 Pro 002',
            modelName: 'gemini-1.5-pro-002',
            modelDescription:
                'Refined version of Gemini 1.5 Pro with improved instruction following, better multimodal understanding, and more consistent outputs.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 1.5 Pro Exp',
            modelName: 'gemini-1.5-pro-exp-0827',
            modelDescription:
                'Experimental version of Gemini 1.5 Pro with new capabilities and optimizations being tested before wider release. May offer improved performance.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 1.0 Pro',
            modelName: 'gemini-1.0-pro',
            modelDescription:
                'Original Gemini series foundation model with solid multimodal capabilities. 32K context window with good performance on text, code, and basic vision tasks.',
            pricing: {
                prompt: pricing(`$0.35 / 1M tokens`),
                output: pricing(`$1.05 / 1M tokens`),
            },
        },
        // <- [🕕]
    ],
});

/**
 * TODO: [🧠] Add information about context window sizes, capabilities, and relative performance characteristics
 * TODO: [🎰] Some mechanism to auto-update available models
 * TODO: [🧠] Verify pricing information is current with Google's official documentation
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
