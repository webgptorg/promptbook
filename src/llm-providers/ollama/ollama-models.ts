import type { AvailableModel } from '../../execution/AvailableModel';
import { exportJson } from '../../utils/serialization/exportJson';

/**
 * List of available models in Ollama library
 *
 * Note: Done at 2025-05-19
 *
 * @see https://ollama.com/library
 * @public exported from `@promptbook/ollama`
 */
export const OLLAMA_MODELS: ReadonlyArray<AvailableModel> = exportJson({
    name: 'OLLAMA_MODELS',
    value: [
        {
            modelVariant: 'CHAT',
            modelTitle: 'llama2',
            modelName: 'llama2',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'llama2-chat',
            modelName: 'llama2-chat',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'alpaca-7b',
            modelName: 'alpaca-7b',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'alpaca-30b',
            modelName: 'alpaca-30b',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'vicuna-13b',
            modelName: 'vicuna-13b',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'falcon-7b',
            modelName: 'falcon-7b',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'falcon-40b',
            modelName: 'falcon-40b',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'bloom-7b',
            modelName: 'bloom-7b',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'mistral-7b',
            modelName: 'mistral-7b',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'gorilla',
            modelName: 'gorilla',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'cerebras-13b',
            modelName: 'cerebras-13b',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'openchat-7b',
            modelName: 'openchat-7b',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'openchat-13b',
            modelName: 'openchat-13b',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'mpt-7b-chat',
            modelName: 'mpt-7b-chat',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'mpt-7b-instruct',
            modelName: 'mpt-7b-instruct',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'command-7b',
            modelName: 'command-7b',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'starcoder',
            modelName: 'starcoder',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'starcoder2',
            modelName: 'starcoder2',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'mixtral-7b-chat',
            modelName: 'mixtral-7b-chat',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'mixtral-8x7b',
            modelName: 'mixtral-8x7b',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'mixtral-8x7b-instruct',
            modelName: 'mixtral-8x7b-instruct',
        },

        // <- [🕕]
    ],
});

/**
 * TODO: [🚸] Not all models are compatible with JSON mode, add this information here and use it
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
