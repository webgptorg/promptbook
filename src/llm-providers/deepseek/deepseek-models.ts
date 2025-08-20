import type { AvailableModel } from '../../execution/AvailableModel';
import type { number_usd } from '../../types/typeAliases';
import { exportJson } from '../../utils/serialization/exportJson';
import { pricing } from '../_common/utils/pricing';

/**
 * List of available Deepseek models with descriptions
 *
 * Note: Synced with official API docs at 2025-08-20
 *
 * @see https://www.deepseek.com/models
 * @public exported from `@promptbook/deepseek`
 */
export const DEEPSEEK_MODELS: ReadonlyArray<
    AvailableModel & {
        modelDescription?: string;
        pricing?: {
            readonly prompt: number_usd;
            readonly output: number_usd;
        };
    }
> = exportJson({
    name: 'DEEPSEEK_MODELS',
    value: [
        {
            modelVariant: 'CHAT',
            modelTitle: 'DeepSeek V3',
            modelName: 'deepseek-chat',
            modelDescription:
                'Latest flagship general-purpose model with 128K context window. Features exceptional reasoning capabilities, advanced code generation, and strong performance across diverse domains. Offers competitive performance with leading models while maintaining cost efficiency. Ideal for complex reasoning, coding, and knowledge-intensive tasks.',
            pricing: {
                prompt: pricing(`$0.14 / 1M tokens`),
                output: pricing(`$0.28 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'DeepSeek R1',
            modelName: 'deepseek-reasoner',
            modelDescription:
                'Advanced reasoning model with 128K context window specializing in complex problem-solving and analytical thinking. Features explicit reasoning chains, enhanced mathematical capabilities, and superior performance on STEM tasks. Designed for applications requiring deep analytical reasoning and step-by-step problem solving.',
            pricing: {
                prompt: pricing(`$0.55 / 1M tokens`),
                output: pricing(`$2.19 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'DeepSeek Coder V2',
            modelName: 'deepseek-coder',
            modelDescription:
                'Specialized coding model with 128K context window optimized for software development tasks. Features exceptional code generation, debugging, and refactoring capabilities across 40+ programming languages. Particularly strong in understanding complex codebases and implementing solutions based on natural language specifications.',
            pricing: {
                prompt: pricing(`$0.14 / 1M tokens`),
                output: pricing(`$0.28 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Deepseek Chat',
            modelName: 'deepseek-chat',
            modelDescription:
                'General-purpose language model with 128K context window. Excels at knowledge-intensive tasks, complex reasoning, and long-form content generation. Features enhanced instruction following and factuality. Ideal for customer support, content creation, and knowledge-based applications.',
            pricing: {
                prompt: pricing(`$0.80 / 1M tokens`),
                output: pricing(`$1.60 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Deepseek Reasoner Pro',
            modelName: 'deepseek-reasoner-pro',
            modelDescription:
                'Advanced reasoning model with 256K context window featuring state-of-the-art capabilities in structured thinking and problem-solving. Particularly optimized for mathematical, logical, and scientific challenges with 50% better performance than base Reasoner. Incorporates verification mechanisms for increased accuracy and reliability.',
            pricing: {
                prompt: pricing(`$5.00 / 1M tokens`),
                output: pricing(`$10.00 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'Deepseek Reasoner',
            modelName: 'deepseek-reasoner',
            modelDescription:
                'Specialized reasoning model with 128K context window designed for mathematical problem-solving, logical analysis, and step-by-step deduction. Implements explicit chain-of-thought prompting with strong capabilities in STEM domains. Optimal for academic, scientific, and technical applications requiring precise analytical thinking.',
            pricing: {
                prompt: pricing(`$3.50 / 1M tokens`),
                output: pricing(`$7.00 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'DeepSeek V4',
            modelName: 'deepseek-v4-0812',
            modelDescription:
                'Latest generation multimodal model with 256K context window. Features revolutionary improvements in reasoning, multilingual capabilities, and multimodal understanding. Supports high-resolution image analysis up to 8K and complex document understanding. Sets new benchmarks in unified text, code, and image processing.',
            pricing: {
                prompt: pricing(`$2.50 / 1M tokens`),
                output: pricing(`$5.00 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'DeepSeek V3',
            modelName: 'deepseek-v3-0324',
            modelDescription:
                'Advanced multimodal model with 128K context window featuring significantly improved reasoning, coding abilities, and visual understanding. Built on latest architecture with enhanced knowledge representation and reduced hallucination rates. Suitable for complex tasks involving text, code, and images that require deep contextual understanding.',
            pricing: {
                prompt: pricing(`$1.50 / 1M tokens`),
                output: pricing(`$3.00 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'DeepSeek R2',
            modelName: 'deepseek-r2',
            modelDescription:
                'Next-generation research model with 256K context window. Significantly enhances the capabilities of R1 with expanded domain expertise, advanced tool use, and superior analytical capabilities. Features specialized modules for different scientific disciplines and improved citation accuracy. Designed for professional research environments.',
            pricing: {
                prompt: pricing(`$7.00 / 1M tokens`),
                output: pricing(`$14.00 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'DeepSeek R1',
            modelName: 'deepseek-r1',
            modelDescription:
                'Research-focused model with 128K context window optimized for scientific problem-solving and analytical tasks. Features domain-specific expertise in mathematics, physics, chemistry, and computer science with exceptional critical thinking capabilities. Ideal for research institutions, academic environments, and technical problem-solving applications.',
            pricing: {
                prompt: pricing(`$5.00 / 1M tokens`),
                output: pricing(`$10.00 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'DeepSeek Coder',
            modelName: 'deepseek-coder',
            modelDescription:
                'Specialized coding model with 128K context window optimized for software development tasks. Features exceptional code generation, debugging, and refactoring capabilities across 40+ programming languages. Particularly strong in understanding complex codebases and implementing solutions based on natural language specifications.',
            pricing: {
                prompt: pricing(`$1.50 / 1M tokens`),
                output: pricing(`$3.00 / 1M tokens`),
            },
        },
        {
            modelVariant: 'EMBEDDING',
            modelTitle: 'DeepSeek Embedder V2',
            modelName: 'deepseek-embedder-v2',
            modelDescription:
                'Next-generation embedding model (2048 dimensions) with 35% improvement in retrieval accuracy over v1. Optimized for complex semantic relationships with enhanced cross-domain understanding and multilingual capabilities. Supports up to 8K tokens per request with adaptive pooling for long documents.',
            pricing: {
                prompt: pricing(`$0.15 / 1M tokens`),
                output: 0,
            },
        },
        {
            modelVariant: 'EMBEDDING',
            modelTitle: 'DeepSeek Embedder',
            modelName: 'deepseek-embedder-v1',
            modelDescription:
                'High-dimensional text embedding model (1536 dimensions) optimized for semantic search, document retrieval, and clustering applications. Features strong cross-lingual capabilities and enhanced performance on both short and long texts. Ideal for RAG systems, semantic search, and document similarity applications.',
            pricing: {
                prompt: pricing(`$0.10 / 1M tokens`),
                output: 0,
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'DeepSeek Vision V3',
            modelName: 'deepseek-vision-v3',
            modelDescription:
                'Latest multimodal vision model supporting ultra-high-resolution image analysis (up to 8192x8192 pixels). Features advanced visual reasoning, improved OCR capabilities, and sophisticated image-to-text understanding. Includes specialized modules for medical imaging, document analysis, and visual programming.',
            pricing: {
                prompt: pricing(`$1.80 / 1M tokens`),
                output: pricing(`$3.60 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'DeepSeek Vision',
            modelName: 'deepseek-vision-v2',
            modelDescription:
                'Advanced multimodal model supporting high-resolution image analysis (up to 4096x4096 pixels) with text. Features detailed visual understanding, object recognition, scene analysis, and OCR capabilities. Maintains contextual awareness between images and text. Ideal for visual QA, document analysis, and image-guided content creation.',
            pricing: {
                prompt: pricing(`$1.20 / 1M tokens`),
                output: pricing(`$2.40 / 1M tokens`),
            },
        },
        // …add any additional at https://www.deepseek.com/models…
    ],
});

/**
 * TODO: [🧠] Add information about context window sizes, capabilities, and relative performance characteristics
 * TODO: [🎰] Some mechanism to auto-update available models
 * TODO: [🧠] Verify pricing information is current with Deepseek's official documentation
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
