import type { AvailableModel } from '../../execution/AvailableModel';
import { exportJson } from '../../utils/serialization/exportJson';
import { pricing } from '../_common/utils/pricing';

/**
 * List of available OpenAI models with pricing
 *
 * Note: Synced with official API docs at 2025-11-19
 *
 * @see https://platform.openai.com/docs/models/
 * @see https://openai.com/api/pricing/
 * @public exported from `@promptbook/openai`
 */
export const OPENAI_MODELS: ReadonlyArray<AvailableModel> = exportJson({
    name: 'OPENAI_MODELS',
    value: [
        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-5.1',
            modelName: 'gpt-5.1',
            modelDescription: 'The best model for coding and agentic tasks with configurable reasoning effort.',
            pricing: {
                prompt: pricing(`$1.25 / 1M tokens`),
                output: pricing(`$10.00 / 1M tokens`),
            },
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-5',
            modelName: 'gpt-5',
            modelDescription:
                "OpenAI's most advanced language model with unprecedented reasoning capabilities and 200K context window. Features revolutionary improvements in complex problem-solving, scientific reasoning, and creative tasks. Demonstrates human-level performance across diverse domains with enhanced safety measures and alignment. Represents the next generation of AI with superior understanding, nuanced responses, and advanced multimodal capabilities. DEPRECATED: Use gpt-5.1 instead.",
            pricing: {
                prompt: pricing(`$1.25 / 1M tokens`),
                output: pricing(`$10.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-5-mini',
            modelName: 'gpt-5-mini',
            modelDescription:
                'A faster, cost-efficient version of GPT-5 for well-defined tasks with 200K context window. Maintains core GPT-5 capabilities while offering 5x faster inference and significantly lower costs. Features enhanced instruction following and reduced latency for production applications requiring quick responses with high quality.',
            pricing: {
                prompt: pricing(`$0.25 / 1M tokens`),
                output: pricing(`$2.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-5-nano',
            modelName: 'gpt-5-nano',
            modelDescription:
                'The fastest, most cost-efficient version of GPT-5 with 200K context window. Optimized for summarization, classification, and simple reasoning tasks. Features 10x faster inference than base GPT-5 while maintaining good quality for straightforward applications. Ideal for high-volume, cost-sensitive deployments.',
            pricing: {
                prompt: pricing(`$0.05 / 1M tokens`),
                output: pricing(`$0.40 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-4.1',
            modelName: 'gpt-4.1',
            modelDescription:
                'Smartest non-reasoning model with 128K context window. Enhanced version of GPT-4 with improved instruction following, better factual accuracy, and reduced hallucinations. Features advanced function calling capabilities and superior performance on coding tasks. Ideal for applications requiring high intelligence without reasoning overhead.',
            pricing: {
                prompt: pricing(`$3.00 / 1M tokens`),
                output: pricing(`$12.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-4.1-mini',
            modelName: 'gpt-4.1-mini',
            modelDescription:
                'Smaller, faster version of GPT-4.1 with 128K context window. Balances intelligence and efficiency with 3x faster inference than base GPT-4.1. Maintains strong capabilities across text generation, reasoning, and coding while offering better cost-performance ratio for most applications.',
            pricing: {
                prompt: pricing(`$0.80 / 1M tokens`),
                output: pricing(`$3.20 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-4.1-nano',
            modelName: 'gpt-4.1-nano',
            modelDescription:
                'Fastest, most cost-efficient version of GPT-4.1 with 128K context window. Optimized for high-throughput applications requiring good quality at minimal cost. Features 5x faster inference than GPT-4.1 while maintaining adequate performance for most general-purpose tasks.',
            pricing: {
                prompt: pricing(`$0.20 / 1M tokens`),
                output: pricing(`$0.80 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'o3',
            modelName: 'o3',
            modelDescription:
                'Advanced reasoning model with 128K context window specializing in complex logical, mathematical, and analytical tasks. Successor to o1 with enhanced step-by-step problem-solving capabilities and superior performance on STEM-focused problems. Ideal for professional applications requiring deep analytical thinking and precise reasoning.',
            pricing: {
                prompt: pricing(`$15.00 / 1M tokens`),
                output: pricing(`$60.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'o3-pro',
            modelName: 'o3-pro',
            modelDescription:
                'Enhanced version of o3 with more compute allocated for better responses on the most challenging problems. Features extended reasoning time and improved accuracy on complex analytical tasks. Designed for applications where maximum reasoning quality is more important than response speed.',
            pricing: {
                prompt: pricing(`$30.00 / 1M tokens`),
                output: pricing(`$120.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'o4-mini',
            modelName: 'o4-mini',
            modelDescription:
                'Fast, cost-efficient reasoning model with 128K context window. Successor to o1-mini with improved analytical capabilities while maintaining speed advantages. Features enhanced mathematical reasoning and logical problem-solving at significantly lower cost than full reasoning models.',
            pricing: {
                prompt: pricing(`$4.00 / 1M tokens`),
                output: pricing(`$16.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'o3-deep-research',
            modelName: 'o3-deep-research',
            modelDescription:
                'Most powerful deep research model with 128K context window. Specialized for comprehensive research tasks, literature analysis, and complex information synthesis. Features advanced citation capabilities and enhanced factual accuracy for academic and professional research applications.',
            pricing: {
                prompt: pricing(`$25.00 / 1M tokens`),
                output: pricing(`$100.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'o4-mini-deep-research',
            modelName: 'o4-mini-deep-research',
            modelDescription:
                'Faster, more affordable deep research model with 128K context window. Balances research capabilities with cost efficiency, offering good performance on literature review, fact-checking, and information synthesis tasks at a more accessible price point.',
            pricing: {
                prompt: pricing(`$12.00 / 1M tokens`),
                output: pricing(`$48.00 / 1M tokens`),
            },
        },
        /**/

        /*/
          {
              modelTitle: 'dall-e-3',
              modelName: 'dall-e-3',
          },
          /**/

        /*/
          {
              modelTitle: 'whisper-1',
              modelName: 'whisper-1',
          },
        /**/

        /**/
        {
            modelVariant: 'COMPLETION',
            modelTitle: 'davinci-002',
            modelName: 'davinci-002',
            modelDescription:
                'Legacy completion model with 4K token context window. Excels at complex text generation, creative writing, and detailed content creation with strong contextual understanding. Optimized for instructions requiring nuanced outputs and extended reasoning. Suitable for applications needing high-quality text generation without conversation management.',
            pricing: {
                prompt: pricing(`$2.00 / 1M tokens`),
                output: pricing(`$2.00 / 1M tokens`),
            },
        },
        /**/

        /*/
      {
          modelTitle: 'dall-e-2',
          modelName: 'dall-e-2',
      },
      /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-3.5-turbo-16k',
            modelName: 'gpt-3.5-turbo-16k',
            modelDescription:
                'Extended context GPT-3.5 Turbo with 16K token window. Maintains core capabilities of standard 3.5 Turbo while supporting longer conversations and documents. Features good balance of performance and cost for applications requiring more context than standard 4K models. Effective for document analysis, extended conversations, and multi-step reasoning tasks.',
            pricing: {
                prompt: pricing(`$3.00 / 1M tokens`),
                output: pricing(`$4.00 / 1M tokens`),
            },
        },
        /**/

        /*/
        {
            modelTitle: 'tts-1-hd-1106',
            modelName: 'tts-1-hd-1106',
        },
        /**/

        /*/
        {
            modelTitle: 'tts-1-hd',
            modelName: 'tts-1-hd',
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-4',
            modelName: 'gpt-4',
            modelDescription:
                'Powerful language model with 8K context window featuring sophisticated reasoning, instruction-following, and knowledge capabilities. Demonstrates strong performance on complex tasks requiring deep understanding and multi-step reasoning. Excels at code generation, logical analysis, and nuanced content creation. Suitable for advanced applications requiring high-quality outputs.',
            pricing: {
                prompt: pricing(`$30.00 / 1M tokens`),
                output: pricing(`$60.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-4-32k',
            modelName: 'gpt-4-32k',
            modelDescription:
                'Extended context version of GPT-4 with 32K token window. Maintains all capabilities of standard GPT-4 while supporting analysis of very lengthy documents, code bases, and conversations. Features enhanced ability to maintain context over long interactions and process detailed information from large inputs. Ideal for document analysis, legal review, and complex problem-solving.',
            pricing: {
                prompt: pricing(`$60.00 / 1M tokens`),
                output: pricing(`$120.00 / 1M tokens`),
            },
        },
        /**/

        /*/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-4-0613',
            modelName: 'gpt-4-0613',
            pricing: {
                prompt: computeUsage(` / 1M tokens`),
                output: computeUsage(` / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-4-turbo-2024-04-09',
            modelName: 'gpt-4-turbo-2024-04-09',
            modelDescription:
                'Latest stable GPT-4 Turbo from April 2024 with 128K context window. Features enhanced reasoning chains, improved factual accuracy with 40% reduction in hallucinations, and better instruction following compared to earlier versions. Includes advanced function calling capabilities and knowledge up to April 2024. Provides optimal performance for enterprise applications requiring reliability.',
            pricing: {
                prompt: pricing(`$10.00 / 1M tokens`),
                output: pricing(`$30.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-3.5-turbo-1106',
            modelName: 'gpt-3.5-turbo-1106',
            modelDescription:
                'November 2023 version of GPT-3.5 Turbo with 16K token context window. Features improved instruction following, more consistent output formatting, and enhanced function calling capabilities. Includes knowledge cutoff from April 2023. Suitable for applications requiring good performance at lower cost than GPT-4 models.',
            pricing: {
                prompt: pricing(`$1.00 / 1M tokens`),
                output: pricing(`$2.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-4-turbo',
            modelName: 'gpt-4-turbo',
            modelDescription:
                'More capable and cost-efficient version of GPT-4 with 128K token context window. Features improved instruction following, advanced function calling capabilities, and better performance on coding tasks. Maintains superior reasoning and knowledge while offering substantial cost reduction compared to base GPT-4. Ideal for complex applications requiring extensive context processing.',
            pricing: {
                prompt: pricing(`$10.00 / 1M tokens`),
                output: pricing(`$30.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'COMPLETION',
            modelTitle: 'gpt-3.5-turbo-instruct-0914',
            modelName: 'gpt-3.5-turbo-instruct-0914',
            modelDescription:
                'September 2023 version of GPT-3.5 Turbo Instruct with 4K context window. Optimized for completion-style instruction following with deterministic responses. Better suited than chat models for applications requiring specific formatted outputs without conversation management. Knowledge cutoff from September 2021.',
            pricing: {
                prompt: pricing(`$1.50  / 1M tokens`),
                output: pricing(`$2.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'COMPLETION',
            modelTitle: 'gpt-3.5-turbo-instruct',
            modelName: 'gpt-3.5-turbo-instruct',
            modelDescription:
                'Optimized version of GPT-3.5 for completion-style API with 4K token context window. Features strong instruction following with single-turn design rather than multi-turn conversation. Provides more consistent, deterministic outputs compared to chat models. Well-suited for templated content generation and structured text transformation tasks.',
            pricing: {
                prompt: pricing(`$1.50  / 1M tokens`),
                output: pricing(`$2.00 / 1M tokens`),
            },
        },
        /**/

        /*/
      {
          modelTitle: 'tts-1',
          modelName: 'tts-1',
      },
      /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-3.5-turbo',
            modelName: 'gpt-3.5-turbo',
            modelDescription:
                'Latest version of GPT-3.5 Turbo with 4K token default context window (16K available). Features continually improved performance with enhanced instruction following and reduced hallucinations. Offers excellent balance between capability and cost efficiency. Suitable for most general-purpose applications requiring good AI capabilities at reasonable cost.',
            pricing: {
                prompt: pricing(`$0.50 / 1M tokens`),
                output: pricing(`$1.50 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-3.5-turbo-0301',
            modelName: 'gpt-3.5-turbo-0301',
            modelDescription:
                'March 2023 version of GPT-3.5 Turbo with 4K token context window. Legacy model maintained for backward compatibility with specific application behaviors. Features solid conversational abilities and basic instruction following. Knowledge cutoff from September 2021. Suitable for applications explicitly designed for this version.',
            pricing: {
                prompt: pricing(`$1.50 / 1M tokens`),
                output: pricing(`$2.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'COMPLETION',
            modelTitle: 'babbage-002',
            modelName: 'babbage-002',
            modelDescription:
                'Efficient legacy completion model with 4K context window balancing performance and speed. Features moderate reasoning capabilities with focus on straightforward text generation tasks. Significantly more efficient than davinci models while maintaining adequate quality for many applications. Suitable for high-volume, cost-sensitive text generation needs.',
            pricing: {
                prompt: pricing(`$0.40 / 1M tokens`),
                output: pricing(`$0.40 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-4-1106-preview',
            modelName: 'gpt-4-1106-preview',
            modelDescription:
                'November 2023 preview version of GPT-4 Turbo with 128K token context window. Features improved instruction following, better function calling capabilities, and enhanced reasoning. Includes knowledge cutoff from April 2023. Suitable for complex applications requiring extensive document understanding and sophisticated interactions.',
            pricing: {
                prompt: pricing(`$10.00 / 1M tokens`),
                output: pricing(`$30.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-4-0125-preview',
            modelName: 'gpt-4-0125-preview',
            modelDescription:
                'January 2024 preview version of GPT-4 Turbo with 128K token context window. Features improved reasoning capabilities, enhanced tool use, and more reliable function calling. Includes knowledge cutoff from October 2023. Offers better performance on complex logical tasks and more consistent outputs than previous preview versions.',
            pricing: {
                prompt: pricing(`$10.00 / 1M tokens`),
                output: pricing(`$30.00 / 1M tokens`),
            },
        },
        /**/

        /*/
      {
          modelTitle: 'tts-1-1106',
          modelName: 'tts-1-1106',
      },
      /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-3.5-turbo-0125',
            modelName: 'gpt-3.5-turbo-0125',
            modelDescription:
                'January 2024 version of GPT-3.5 Turbo with 16K token context window. Features improved reasoning capabilities, better instruction adherence, and reduced hallucinations compared to previous versions. Includes knowledge cutoff from September 2021. Provides good performance for most general applications at reasonable cost.',
            pricing: {
                prompt: pricing(`$0.50 / 1M tokens`),
                output: pricing(`$1.50  / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-4-turbo-preview',
            modelName: 'gpt-4-turbo-preview',
            modelDescription:
                'Preview version of GPT-4 Turbo with 128K token context window that points to the latest development model. Features cutting-edge improvements to instruction following, knowledge representation, and tool use capabilities. Provides access to newest features but may have occasional behavior changes. Best for non-critical applications wanting latest capabilities.',
            pricing: {
                prompt: pricing(`$10.00 / 1M tokens`),
                output: pricing(`$30.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'EMBEDDING',
            modelTitle: 'text-embedding-3-large',
            modelName: 'text-embedding-3-large',
            modelDescription:
                "OpenAI's most capable text embedding model generating 3072-dimensional vectors. Designed for high-quality embeddings for complex similarity tasks, clustering, and information retrieval. Features enhanced cross-lingual capabilities and significantly improved performance on retrieval and classification benchmarks. Ideal for sophisticated RAG systems and semantic search applications.",
            pricing: {
                prompt: pricing(`$0.13 / 1M tokens`),
                output: 0,
            },
        },
        /**/

        /**/
        {
            modelVariant: 'EMBEDDING',
            modelTitle: 'text-embedding-3-small',
            modelName: 'text-embedding-3-small',
            modelDescription:
                'Cost-effective embedding model generating 1536-dimensional vectors. Balances quality and efficiency for simpler tasks while maintaining good performance on text similarity and retrieval applications. Offers 20% better quality than ada-002 at significantly lower cost. Ideal for production embedding applications with cost constraints.',
            pricing: {
                prompt: pricing(`$0.02 / 1M tokens`),
                output: 0,
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-3.5-turbo-0613',
            modelName: 'gpt-3.5-turbo-0613',
            modelDescription:
                "June 2023 version of GPT-3.5 Turbo with 4K token context window. Features function calling capabilities for structured data extraction and API interaction. Includes knowledge cutoff from September 2021. Maintained for applications specifically designed for this version's behaviors and capabilities.",
            pricing: {
                prompt: pricing(`$1.50 / 1M tokens`),
                output: pricing(`$2.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'EMBEDDING',
            modelTitle: 'text-embedding-ada-002',
            modelName: 'text-embedding-ada-002',
            modelDescription:
                'Legacy text embedding model generating 1536-dimensional vectors suitable for text similarity and retrieval applications. Processes up to 8K tokens per request with consistent embedding quality. While superseded by newer embedding-3 models, still maintains adequate performance for many semantic search and classification tasks.',
            pricing: {
                prompt: pricing(`$0.1 / 1M tokens`),
                output: 0,
            },
        },
        /**/

        /*/
      {
          modelVariant: 'CHAT',
          modelTitle: 'gpt-4-1106-vision-preview',
          modelName: 'gpt-4-1106-vision-preview',
      },
      /**/

        /*/
      {
          modelVariant: 'CHAT',
          modelTitle: 'gpt-4-vision-preview',
          modelName: 'gpt-4-vision-preview',
          pricing: {
              prompt: computeUsage(`$10.00 / 1M tokens`),
              output: computeUsage(`$30.00 / 1M tokens`),
          },
      },
      /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-4o-2024-05-13',
            modelName: 'gpt-4o-2024-05-13',
            modelDescription:
                'May 2024 version of GPT-4o with 128K context window. Features enhanced multimodal capabilities including superior image understanding (up to 20MP), audio processing, and improved reasoning. Optimized for 2x lower latency than GPT-4 Turbo while maintaining high performance. Includes knowledge up to October 2023. Ideal for production applications requiring reliable multimodal capabilities.',
            pricing: {
                prompt: pricing(`$5.00 / 1M tokens`),
                output: pricing(`$15.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-4o',
            modelName: 'gpt-4o',
            modelDescription:
                "OpenAI's most advanced general-purpose multimodal model with 128K context window. Optimized for balanced performance, speed, and cost with 2x faster responses than GPT-4 Turbo. Features excellent vision processing, audio understanding, reasoning, and text generation quality. Represents optimal balance of capability and efficiency for most advanced applications.",
            pricing: {
                prompt: pricing(`$5.00 / 1M tokens`),
                output: pricing(`$15.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-4o-mini',
            modelName: 'gpt-4o-mini',
            modelDescription:
                'Smaller, more cost-effective version of GPT-4o with 128K context window. Maintains impressive capabilities across text, vision, and audio tasks while operating at significantly lower cost. Features 3x faster inference than GPT-4o with good performance on general tasks. Excellent for applications requiring good quality multimodal capabilities at scale.',
            pricing: {
                prompt: pricing(`$0.15 / 1M tokens`),
                output: pricing(`$0.60 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'o1-preview',
            modelName: 'o1-preview',
            modelDescription:
                'Advanced reasoning model with 128K context window specializing in complex logical, mathematical, and analytical tasks. Features exceptional step-by-step problem-solving capabilities, advanced mathematical and scientific reasoning, and superior performance on STEM-focused problems. Significantly outperforms GPT-4 on quantitative reasoning benchmarks. Ideal for professional and specialized applications.',
            pricing: {
                prompt: pricing(`$15.00 / 1M tokens`),
                output: pricing(`$60.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'o1-preview-2024-09-12',
            modelName: 'o1-preview-2024-09-12',
            modelDescription:
                'September 2024 version of O1 preview with 128K context window. Features specialized reasoning capabilities with 30% improvement on mathematical and scientific accuracy over previous versions. Includes enhanced support for formal logic, statistical analysis, and technical domains. Optimized for professional applications requiring precise analytical thinking and rigorous methodologies.',
            pricing: {
                prompt: pricing(`$15.00 / 1M tokens`),
                output: pricing(`$60.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'o1-mini',
            modelName: 'o1-mini',
            modelDescription:
                'Smaller, cost-effective version of the O1 model with 128K context window. Maintains strong analytical reasoning abilities while reducing computational requirements by 70%. Features good performance on mathematical, logical, and scientific tasks at significantly lower cost than full O1. Excellent for everyday analytical applications that benefit from reasoning focus.',
            pricing: {
                prompt: pricing(`$3.00 / 1M tokens`),
                output: pricing(`$12.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'o1',
            modelName: 'o1',
            modelDescription:
                "OpenAI's advanced reasoning model with 128K context window focusing on logical problem-solving and analytical thinking. Features exceptional performance on quantitative tasks, step-by-step deduction, and complex technical problems. Maintains 95%+ of o1-preview capabilities with production-ready stability. Ideal for scientific computing, financial analysis, and professional applications.",
            pricing: {
                prompt: pricing(`$15.00 / 1M tokens`),
                output: pricing(`$60.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'o3-mini',
            modelName: 'o3-mini',
            modelDescription:
                'Cost-effective reasoning model with 128K context window optimized for academic and scientific problem-solving. Features efficient performance on STEM tasks with specialized capabilities in mathematics, physics, chemistry, and computer science. Offers 80% of O1 performance on technical domains at significantly lower cost. Ideal for educational applications and research support.',
            pricing: {
                prompt: pricing(`$3.00 / 1M tokens`),
                output: pricing(`$12.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'o1-mini-2024-09-12',
            modelName: 'o1-mini-2024-09-12',
            modelDescription:
                "September 2024 version of O1-mini with 128K context window featuring balanced reasoning capabilities and cost-efficiency. Includes 25% improvement in mathematical accuracy and enhanced performance on coding tasks compared to previous versions. Maintains efficient resource utilization while delivering improved results for analytical applications that don't require the full O1 model.",
            pricing: {
                prompt: pricing(`$3.00 / 1M tokens`),
                output: pricing(`$12.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-3.5-turbo-16k-0613',
            modelName: 'gpt-3.5-turbo-16k-0613',
            modelDescription:
                "June 2023 version of GPT-3.5 Turbo with extended 16K token context window. Features good handling of longer conversations and documents with improved memory management across extended contexts. Includes knowledge cutoff from September 2021. Maintained for applications specifically designed for this version's behaviors and capabilities.",
            pricing: {
                prompt: pricing(`$3.00 / 1M tokens`),
                output: pricing(`$4.00 / 1M tokens`),
            },
        },
        /**/

        // <- [🕕]
    ],
});

/**
 * Note: [🤖] Add models of new variant
 * TODO: [🧠] Some mechanism to propagate unsureness
 * TODO: [🎰] Some mechanism to auto-update available models
 * TODO: [🎰][👮‍♀️] Make this list dynamic - dynamically can be listed modelNames but not modelVariant, legacy status, context length and pricing
 * TODO: [🧠][👮‍♀️] Put here more info like description, isVision, trainingDateCutoff, languages, strengths (	Top-level performance, intelligence, fluency, and understanding), contextWindow,...
 * @see https://platform.openai.com/docs/models/gpt-4-turbo-and-gpt-4
 * @see https://openai.com/api/pricing/
 * @see /other/playground/playground.ts
 * TODO: [🍓][💩] Make better
 * TODO: Change model titles to human eg: "gpt-4-turbo-2024-04-09" -> "GPT-4 Turbo (2024-04-09)"
 * TODO: [🚸] Not all models are compatible with JSON mode, add this information here and use it
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
