import type { AvailableModel } from '../../execution/AvailableModel';
import type { number_usd } from '../../types/typeAliases';
import { exportJson } from '../../utils/serialization/exportJson';
import { computeUsage } from './computeUsage';

/**
 * List of available OpenAI models with pricing
 *
 * Note: Done at 2025-05-06
 *
 * @see https://platform.openai.com/docs/models/
 * @see https://openai.com/api/pricing/
 * @public exported from `@promptbook/openai`
 */
export const OPENAI_MODELS: ReadonlyArray<
    AvailableModel & {
        pricing?: {
            readonly prompt: number_usd;
            readonly output: number_usd;
        };
    }
> = exportJson({
    name: 'OPENAI_MODELS',
    value: [
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
                'Legacy completion model with strong performance on text generation tasks. Optimized for complex instructions and longer outputs.',
            pricing: {
                prompt: computeUsage(`$2.00 / 1M tokens`),
                output: computeUsage(`$2.00 / 1M tokens`),
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
                'GPT-3.5 Turbo with extended 16k token context length for handling longer conversations and documents.',
            pricing: {
                prompt: computeUsage(`$3.00 / 1M tokens`),
                output: computeUsage(`$4.00 / 1M tokens`),
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
                'GPT-4 is a powerful language model with enhanced reasoning, instruction-following capabilities, and 8K context window. Optimized for complex tasks requiring deep understanding.',
            pricing: {
                prompt: computeUsage(`$30.00 / 1M tokens`),
                output: computeUsage(`$60.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-4-32k',
            modelName: 'gpt-4-32k',
            modelDescription:
                'Extended context version of GPT-4 with a 32K token window for processing very long inputs and generating comprehensive responses for complex tasks.',
            pricing: {
                prompt: computeUsage(`$60.00 / 1M tokens`),
                output: computeUsage(`$120.00 / 1M tokens`),
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
                'Latest stable GPT-4 Turbo model from April 2024 with enhanced reasoning and context handling capabilities. Offers 128K context window and improved performance.',
            pricing: {
                prompt: computeUsage(`$10.00 / 1M tokens`),
                output: computeUsage(`$30.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-3.5-turbo-1106',
            modelName: 'gpt-3.5-turbo-1106',
            modelDescription:
                'November 2023 version of GPT-3.5 Turbo with improved instruction following and a 16K token context window.',
            pricing: {
                prompt: computeUsage(`$1.00 / 1M tokens`),
                output: computeUsage(`$2.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-4-turbo',
            modelName: 'gpt-4-turbo',
            modelDescription:
                'More capable model than GPT-4 with improved instruction following, function calling and a 128K token context window for handling very large documents.',
            pricing: {
                prompt: computeUsage(`$10.00 / 1M tokens`),
                output: computeUsage(`$30.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'COMPLETION',
            modelTitle: 'gpt-3.5-turbo-instruct-0914',
            modelName: 'gpt-3.5-turbo-instruct-0914',
            modelDescription:
                'September 2023 version of GPT-3.5 Turbo optimized for completion-style instruction following with a 4K context window.',
            pricing: {
                prompt: computeUsage(`$1.50  / 1M tokens`), // <- For gpt-3.5-turbo-instruct
                output: computeUsage(`$2.00 / 1M tokens`), // <- For gpt-3.5-turbo-instruct
            },
        },
        /**/

        /**/
        {
            modelVariant: 'COMPLETION',
            modelTitle: 'gpt-3.5-turbo-instruct',
            modelName: 'gpt-3.5-turbo-instruct',
            modelDescription:
                'Optimized version of GPT-3.5 for completion-style API with good instruction following and a 4K token context window.',
            pricing: {
                prompt: computeUsage(`$1.50  / 1M tokens`),
                output: computeUsage(`$2.00 / 1M tokens`),
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
                'Latest version of GPT-3.5 Turbo with improved performance and instruction following capabilities. Default 4K context window with options for 16K.',
            pricing: {
                prompt: computeUsage(`$0.50 / 1M tokens`),
                output: computeUsage(`$1.50 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-3.5-turbo-0301',
            modelName: 'gpt-3.5-turbo-0301',
            modelDescription:
                'March 2023 version of GPT-3.5 Turbo with a 4K token context window. Legacy model maintained for backward compatibility.',
            pricing: {
                prompt: computeUsage(`$1.50 / 1M tokens`),
                output: computeUsage(`$2.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'COMPLETION',
            modelTitle: 'babbage-002',
            modelName: 'babbage-002',
            modelDescription:
                'Efficient legacy completion model with a good balance of performance and speed. Suitable for straightforward text generation tasks.',
            pricing: {
                prompt: computeUsage(`$0.40 / 1M tokens`),
                output: computeUsage(`$0.40 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-4-1106-preview',
            modelName: 'gpt-4-1106-preview',
            modelDescription:
                'November 2023 preview version of GPT-4 Turbo with improved instruction following and a 128K token context window.',
            pricing: {
                prompt: computeUsage(`$10.00 / 1M tokens`),
                output: computeUsage(`$30.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-4-0125-preview',
            modelName: 'gpt-4-0125-preview',
            modelDescription:
                'January 2024 preview version of GPT-4 Turbo with improved reasoning capabilities and a 128K token context window.',
            pricing: {
                prompt: computeUsage(`$10.00 / 1M tokens`),
                output: computeUsage(`$30.00 / 1M tokens`),
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
                'January 2024 version of GPT-3.5 Turbo with improved reasoning capabilities and a 16K token context window.',
            pricing: {
                prompt: computeUsage(`$0.50 / 1M tokens`),
                output: computeUsage(`$1.50  / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-4-turbo-preview',
            modelName: 'gpt-4-turbo-preview',
            modelDescription:
                'Preview version of GPT-4 Turbo that points to the latest model version. Features improved instruction following, 128K token context window and lower latency.',
            pricing: {
                prompt: computeUsage(`$10.00 / 1M tokens`),
                output: computeUsage(`$30.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'EMBEDDING',
            modelTitle: 'text-embedding-3-large',
            modelName: 'text-embedding-3-large',
            modelDescription:
                "OpenAI's most capable text embedding model designed for high-quality embeddings for complex similarity tasks and information retrieval.",
            pricing: {
                prompt: computeUsage(`$0.13 / 1M tokens`),
                // TODO: [🏏] Leverage the batch API @see https://platform.openai.com/docs/guides/batch
                output: 0, // <- Note: [🆖] In Embedding models you dont pay for output
            },
        },
        /**/

        /**/
        {
            modelVariant: 'EMBEDDING',
            modelTitle: 'text-embedding-3-small',
            modelName: 'text-embedding-3-small',
            modelDescription:
                'Cost-effective embedding model with good performance for simpler tasks like text similarity and retrieval. Good balance of quality and efficiency.',
            pricing: {
                prompt: computeUsage(`$0.02 / 1M tokens`),
                // TODO: [🏏] Leverage the batch API @see https://platform.openai.com/docs/guides/batch
                output: 0, // <- Note: [🆖] In Embedding models you dont pay for output
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-3.5-turbo-0613',
            modelName: 'gpt-3.5-turbo-0613',
            modelDescription:
                'June 2023 version of GPT-3.5 Turbo with function calling capabilities and a 4K token context window.',
            pricing: {
                prompt: computeUsage(`$1.50 / 1M tokens`),
                output: computeUsage(`$2.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'EMBEDDING',
            modelTitle: 'text-embedding-ada-002',
            modelName: 'text-embedding-ada-002',
            modelDescription:
                'Legacy text embedding model suitable for text similarity and retrieval augmented generation use cases. Replaced by newer embedding-3 models.',
            pricing: {
                prompt: computeUsage(`$0.1 / 1M tokens`), // <- Not sure, taken from https://tokescompare.io/product/openai-text-embedding-ada-002/, no official pricing
                // TODO: [🏏] Leverage the batch API @see https://platform.openai.com/docs/guides/batch
                output: 0, // <- Note: [🆖] In Embedding models you dont pay for output
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
                'May 2024 version of GPT-4o with enhanced multimodal capabilities, improved reasoning, and optimized for vision, audio and chat at lower latencies.',
            pricing: {
                prompt: computeUsage(`$5.00 / 1M tokens`),
                output: computeUsage(`$15.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-4o',
            modelName: 'gpt-4o',
            modelDescription:
                "OpenAI's most advanced multimodal model optimized for performance, speed, and cost. Capable of vision, reasoning, and high quality text generation.",
            pricing: {
                prompt: computeUsage(`$5.00 / 1M tokens`),
                output: computeUsage(`$15.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-4o-mini',
            modelName: 'gpt-4o-mini',
            modelDescription:
                'Smaller, more cost-effective version of GPT-4o with good performance across text, vision, and audio tasks at reduced complexity.',
            pricing: {
                prompt: computeUsage(`$0.15 / 1M tokens`),
                output: computeUsage(`$0.60 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'o1-preview',
            modelName: 'o1-preview',
            modelDescription:
                'Advanced reasoning model with exceptional performance on complex logical, mathematical, and analytical tasks. Built for deep reasoning and specialized professional tasks.',
            pricing: {
                prompt: computeUsage(`$15.00 / 1M tokens`),
                output: computeUsage(`$60.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'o1-preview-2024-09-12',
            modelName: 'o1-preview-2024-09-12',
            modelDescription:
                'September 2024 version of O1 preview with specialized reasoning capabilities for complex tasks requiring precise analytical thinking.',
            //             <- TODO: [💩] Some better system to organize these date suffixes and versions
            pricing: {
                prompt: computeUsage(`$15.00 / 1M tokens`),
                output: computeUsage(`$60.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'o1-mini',
            modelName: 'o1-mini',
            modelDescription:
                'Smaller, cost-effective version of the O1 model with good performance on reasoning tasks while maintaining efficiency for everyday analytical use.',
            pricing: {
                prompt: computeUsage(`$3.00 / 1M tokens`),
                output: computeUsage(`$12.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'o1',
            modelName: 'o1',
            modelDescription:
                "OpenAI's advanced reasoning model focused on logic and problem-solving. Designed for complex analytical tasks with rigorous step-by-step reasoning. 128K context window.",
            pricing: {
                prompt: computeUsage(`$15.00 / 1M tokens`),
                output: computeUsage(`$60.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'o3-mini',
            modelName: 'o3-mini',
            modelDescription:
                'Cost-effective reasoning model optimized for academic and scientific problem-solving. Efficient performance on STEM tasks with deep mathematical and scientific knowledge. 128K context window.',
            pricing: {
                prompt: computeUsage(`$3.00 / 1M tokens`),
                output: computeUsage(`$12.00 / 1M tokens`),
                // <- TODO: !! Unsure, check the pricing
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'o1-mini-2024-09-12',
            modelName: 'o1-mini-2024-09-12',
            modelDescription:
                "September 2024 version of O1-mini with balanced reasoning capabilities and cost-efficiency. Good for analytical tasks that don't require the full O1 model.",
            pricing: {
                prompt: computeUsage(`$3.00 / 1M tokens`),
                output: computeUsage(`$12.00 / 1M tokens`),
            },
        },
        /**/

        /**/
        {
            modelVariant: 'CHAT',
            modelTitle: 'gpt-3.5-turbo-16k-0613',
            modelName: 'gpt-3.5-turbo-16k-0613',
            modelDescription:
                'June 2023 version of GPT-3.5 Turbo with extended 16k token context window for processing longer conversations and documents.',
            pricing: {
                prompt: computeUsage(`$3.00 / 1M tokens`),
                output: computeUsage(`$4.00 / 1M tokens`),
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
