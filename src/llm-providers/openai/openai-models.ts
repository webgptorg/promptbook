import type { AvailableModel } from '../../execution/LlmExecutionTools';
import type { number_usd } from '../../types/typeAliases';
import { computeUsage } from './computeUsage';

/**
 * List of available OpenAI models with pricing
 *
 * Note: Done at 2024-05-20
 *
 * @see https://platform.openai.com/docs/models/
 * @see https://openai.com/api/pricing/
 */
export const OPENAI_MODELS: Array<
    AvailableModel & {
        pricing?: {
            prompt: number_usd;
            output: number_usd;
        };
    }
> = [
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
        pricing: {
            prompt: computeUsage(`$2.00 / 1M tokens`), // <- not sure
            output: computeUsage(`$2.00 / 1M tokens`), // <- not sure
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
        pricing: {
            prompt: computeUsage(`$3.00 / 1M tokens`), // <- Not sure, refer to gpt-3.5-turbo in Fine-tuning models
            output: computeUsage(`$6.00 / 1M tokens`), // <- Not sure, refer to gpt-3.5-turbo in Fine-tuning models
        },
    },
    /**/

    /**/
    {
        modelVariant: 'CHAT',
        modelTitle: 'gpt-3.5-turbo-0301',
        modelName: 'gpt-3.5-turbo-0301',
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
        pricing: {
            prompt: computeUsage(`$0.40 / 1M tokens`), // <- Not sure
            output: computeUsage(`$0.40 / 1M tokens`), // <- Not sure
        },
    },
    /**/

    /**/
    {
        modelVariant: 'CHAT',
        modelTitle: 'gpt-4-1106-preview',
        modelName: 'gpt-4-1106-preview',
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
        pricing: {
            prompt: computeUsage(`$10.00 / 1M tokens`), // <- Not sure, just for gpt-4-turbo
            output: computeUsage(`$30.00 / 1M tokens`), // <- Not sure, just for gpt-4-turbo
        },
    },
    /**/

    /*/
  {
      modelTitle: 'text-embedding-3-large',
      modelName: 'text-embedding-3-large',
  },
  /**/

    /*/
  {
      modelTitle: 'text-embedding-3-small',
      modelName: 'text-embedding-3-small',
  },
  /**/

    /**/
    {
        modelVariant: 'CHAT',
        modelTitle: 'gpt-3.5-turbo-0613',
        modelName: 'gpt-3.5-turbo-0613',
        pricing: {
            prompt: computeUsage(`$1.50 / 1M tokens`),
            output: computeUsage(`$2.00 / 1M tokens`),
        },
    },
    /**/

    /*/
  {
      modelTitle: 'text-embedding-ada-002',
      modelName: 'text-embedding-ada-002',
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
        pricing: {
            prompt: computeUsage(`$5.00 / 1M tokens`),
            output: computeUsage(`$15.00 / 1M tokens`),
        },
    },
    /**/

    /**/
    {
        modelVariant: 'CHAT',
        modelTitle: 'gpt-3.5-turbo-16k-0613',
        modelName: 'gpt-3.5-turbo-16k-0613',
        pricing: {
            prompt: computeUsage(`$3.00 / 1M tokens`),
            output: computeUsage(`$4.00 / 1M tokens`),
        },
    },
    /**/
];

/**
 * TODO: !!!! Add embedding models
 * TODO: [🧠] Some mechanism to propagate unsureness
 * TODO: [🕚][👮‍♀️] Make this list dynamic - dynamically can be listed modelNames but not modelVariant, legacy status, context length and pricing
 * TODO: [🧠][👮‍♀️] Put here more info like description, isVision, trainingDateCutoff, languages, strengths (	Top-level performance, intelligence, fluency, and understanding), contextWindow,...
 * @see https://platform.openai.com/docs/models/gpt-4-turbo-and-gpt-4
 * @see https://openai.com/api/pricing/
 * @see /other/playground/playground.ts
 * TODO: [🍓] Make better
 * TODO: Change model titles to human eg: "gpt-4-turbo-2024-04-09" -> "GPT-4 Turbo (2024-04-09)"
 */
