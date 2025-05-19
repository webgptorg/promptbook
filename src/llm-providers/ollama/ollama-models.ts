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
            modelDescription: 'Meta Llama 2, a general-purpose large language model.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'llama2-chat',
            modelName: 'llama2-chat',
            modelDescription: 'Meta Llama 2 Chat, optimized for conversational tasks.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'alpaca-7b',
            modelName: 'alpaca-7b',
            modelDescription: 'Stanford Alpaca 7B, instruction-tuned LLaMA model.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'alpaca-30b',
            modelName: 'alpaca-30b',
            modelDescription: 'Stanford Alpaca 30B, larger instruction-tuned LLaMA model.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'vicuna-13b',
            modelName: 'vicuna-13b',
            modelDescription: 'Vicuna 13B, fine-tuned LLaMA for chat and instruction.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'falcon-7b',
            modelName: 'falcon-7b',
            modelDescription: 'Falcon 7B, a performant open large language model.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'falcon-40b',
            modelName: 'falcon-40b',
            modelDescription: 'Falcon 40B, a larger open large language model.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'bloom-7b',
            modelName: 'bloom-7b',
            modelDescription: 'BLOOM 7B, multilingual large language model.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'mistral-7b',
            modelName: 'mistral-7b',
            modelDescription: 'Mistral 7B, efficient and fast open LLM.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'gorilla',
            modelName: 'gorilla',
            modelDescription: 'Gorilla, open-source LLM for tool use and APIs.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'cerebras-13b',
            modelName: 'cerebras-13b',
            modelDescription: 'Cerebras-GPT 13B, open large language model.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'openchat-7b',
            modelName: 'openchat-7b',
            modelDescription: 'OpenChat 7B, fine-tuned for conversational tasks.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'openchat-13b',
            modelName: 'openchat-13b',
            modelDescription: 'OpenChat 13B, larger conversational LLM.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'mpt-7b-chat',
            modelName: 'mpt-7b-chat',
            modelDescription: 'MPT-7B Chat, optimized for dialogue and chat.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'mpt-7b-instruct',
            modelName: 'mpt-7b-instruct',
            modelDescription: 'MPT-7B Instruct, instruction-tuned variant.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'command-7b',
            modelName: 'command-7b',
            modelDescription: 'Command 7B, instruction-following LLM.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'starcoder',
            modelName: 'starcoder',
            modelDescription: 'StarCoder, code generation large language model.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'starcoder2',
            modelName: 'starcoder2',
            modelDescription: 'StarCoder2, improved code generation model.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'mixtral-7b-chat',
            modelName: 'mixtral-7b-chat',
            modelDescription: 'Mixtral 7B Chat, Mixture-of-Experts conversational model.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'mixtral-8x7b',
            modelName: 'mixtral-8x7b',
            modelDescription: 'Mixtral 8x7B, Mixture-of-Experts large language model.',
        },
        {
            modelVariant: 'CHAT',
            modelTitle: 'mixtral-8x7b-instruct',
            modelName: 'mixtral-8x7b-instruct',
            modelDescription: 'Mixtral 8x7B Instruct, instruction-tuned Mixture-of-Experts model.',
        },

        // <- [🕕]
    ],
});

/**
 * TODO: [🚸] Not all models are compatible with JSON mode, add this information here and use it
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
