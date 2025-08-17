import type { AvailableModel } from '../../execution/AvailableModel';
import type { number_usd } from '../../types/typeAliases';
import { exportJson } from '../../utils/serialization/exportJson';
import { pricing } from '../_common/utils/pricing';

/**
 * List of available Google models with descriptions
 *
 * Note: Synced with official API docs at 2025-08-17
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
                'Latest advanced multimodal model with 1M token context window. Features exceptional reasoning across complex tasks, sophisticated function calling, and advanced image analysis (16MP resolution). Demonstrates superior performance in math, coding, and knowledge-intensive tasks with 30% improvement over Gemini 1.5 Pro. Ideal for enterprise applications requiring deep contextual understanding.',
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
                'Fast, efficient model with 128K context window optimized for rapid response times. Balances performance and cost with 2x lower latency than Pro models while maintaining strong capabilities in text generation, code completion, and logical reasoning. Excellent for interactive applications, chatbots, and services requiring quick responses with good quality.',
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
                'Streamlined version of Gemini 2.0 Flash with 64K context window, designed for extremely low-latency applications. Features 40% smaller model size and 3x faster inference while retaining core capabilities for text and simple reasoning tasks. Perfect for mobile applications, edge deployments, and high-volume services with strict latency requirements.',
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
                'Experimental model with 128K context window focused on enhanced reasoning with explicit chain-of-thought processes. Specializes in structured problem-solving approaches for mathematics, logic, and analytical tasks. Provides visible intermediate reasoning steps for better transparency and verification. Ideal for educational applications, analytical systems, and step-by-step problem solving.',
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
                'Efficient model with 1M token context window balancing speed and quality. Features 2x faster inference than Pro models while maintaining good multimodal capabilities across text, code, and images. Supports complex document analysis with full context utilization. Well-suited for applications requiring good performance at scale with cost efficiency.',
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
                'Dynamic pointer to the most recent version of Gemini 1.5 Flash with 1M token context window. Automatically incorporates latest improvements, bug fixes, and performance enhancements while maintaining API compatibility. Recommended for production applications that want to stay current with model improvements without manual updates.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 1.5 Flash 001',
            modelName: 'gemini-1.5-flash-001',
            modelDescription:
                'First stable release of Gemini 1.5 Flash with 1M token context window. Features consistent performance characteristics for production applications with reliable behavior across text, code, and basic image understanding tasks. Good option for applications requiring version stability and predictable performance.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 1.5 Flash 002',
            modelName: 'gemini-1.5-flash-002',
            modelDescription:
                'Improved version of Gemini 1.5 Flash with 1M token context window featuring enhanced instruction following and more consistent outputs. Includes 15% better performance on reasoning benchmarks and reduced hallucination rates compared to 001 version. Offers better application integration while maintaining efficiency.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 1.5 Flash Exp',
            modelName: 'gemini-1.5-flash-exp-0827',
            modelDescription:
                'Experimental version of Gemini 1.5 Flash with 1M token context window featuring new capabilities being tested. Includes improvements to context utilization, memory efficiency, and prompt adherence. May offer enhanced performance but with potential behavior differences from stable releases. Suitable for testing and non-critical applications.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 1.5 Flash 8B',
            modelName: 'gemini-1.5-flash-8b',
            modelDescription:
                'Compact 8B parameter model with 128K context window optimized for deployment in resource-constrained environments. Features remarkably strong performance despite smaller size, with specialized distillation techniques to maintain quality. Ideal for mobile applications, edge devices, and scenarios with limited computational resources.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 1.5 Flash 8B Latest',
            modelName: 'gemini-1.5-flash-8b-latest',
            modelDescription:
                'Points to the most recent version of the compact 8B parameter model with 128K context window. Automatically incorporates latest optimizations and improvements while maintaining small resource footprint. Best for applications that need the most current compact model without manual version management.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 1.5 Flash 8B Exp',
            modelName: 'gemini-1.5-flash-8b-exp-0924',
            modelDescription:
                'Experimental version of the 8B parameter model with 128K context window featuring new compression techniques and architectural optimizations. Includes testing of enhanced reasoning capabilities while maintaining efficiency. Suitable for evaluating cutting-edge compact model performance in non-critical applications.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 1.5 Flash 8B Exp',
            modelName: 'gemini-1.5-flash-8b-exp-0827',
            modelDescription:
                'August experimental release of the efficient 8B parameter model with 128K context window. Features specific improvements to reasoning capabilities with 20% better performance on logical tasks compared to stable release. Maintains small footprint while pushing the boundaries of compact model capabilities.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 1.5 Pro Latest',
            modelName: 'gemini-1.5-pro-latest',
            modelDescription:
                'Points to the most recent version of the flagship Gemini 1.5 Pro model with 1M token context window. Automatically incorporates latest capabilities, knowledge updates, and performance improvements. Recommended for production applications requiring the most current full-featured model capabilities.',
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
                'Flagship multimodal model with 1M token context window featuring exceptional performance across text, code, vision, and audio tasks. Supports analysis of long documents, videos, and complex multimodal inputs with contextual understanding. Features strong reasoning, code generation, and multilingual capabilities. Ideal for enterprise applications requiring deep comprehension.',
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
                'First stable release of Gemini 1.5 Pro with 1M token context window featuring consistent performance characteristics and reliable behavior. Provides strong foundation for production applications with predictable outputs and stable API integration. Good choice for applications requiring version stability.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 1.5 Pro 002',
            modelName: 'gemini-1.5-pro-002',
            modelDescription:
                'Refined version of Gemini 1.5 Pro with 1M token context window featuring improved instruction following, enhanced multimodal understanding, and more consistent outputs. Includes 20% reduction in hallucination rates and better performance on complex reasoning tasks compared to 001 version.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 1.5 Pro Exp',
            modelName: 'gemini-1.5-pro-exp-0827',
            modelDescription:
                'Experimental version of Gemini 1.5 Pro with 1M token context window featuring new capabilities being tested before wider release. Includes enhanced reasoning, improved code generation, and better context utilization. May offer improved performance but with potential behavior differences from stable releases.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini 1.0 Pro',
            modelName: 'gemini-1.0-pro',
            modelDescription:
                'Original Gemini series foundation model with 32K context window featuring solid multimodal capabilities. Provides good performance on text, code, and basic vision tasks with reliable instruction following. Legacy model maintained for backward compatibility with established applications and workflows.',
            pricing: {
                prompt: pricing(`$0.35 / 1M tokens`),
                output: pricing(`$1.05 / 1M tokens`),
            },
        },
        {
            modelVariant: 'EMBEDDING',
            modelTitle: 'Gemini Embedder',
            modelName: 'gemini-embedder-v1',
            modelDescription:
                'High-quality embedding model generating 768-dimensional vector representations optimized for semantic search and retrieval. Features strong cross-lingual capabilities, robust document clustering, and excellent performance on both similarity and retrieval tasks. Handles contexts up to 4K tokens with efficient processing. Ideal for RAG systems and semantic applications.',
            pricing: {
                prompt: pricing(`$0.08 / 1M tokens`),
                output: 0,
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Gemini Pro Vision',
            modelName: 'gemini-pro-vision-v1',
            modelDescription:
                'Advanced multimodal model with 32K context window specializing in combined vision and language understanding. Processes high-resolution images (up to 20MP) with detailed visual analysis capabilities including object recognition, scene understanding, and text extraction from images. Particularly effective for document analysis, visual question answering, and multimodal content creation.',
            pricing: {
                prompt: pricing(`$9.00 / 1M tokens`),
                output: pricing(`$27.00 / 1M tokens`),
            },
        },
        // …add any additional from https://ai.google.dev/models/gemini…
    ],
});

/**
 * TODO: [🧠] Add information about context window sizes, capabilities, and relative performance characteristics
 * TODO: [🎰] Some mechanism to auto-update available models
 * TODO: [🧠] Verify pricing information is current with Google's official documentation
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
