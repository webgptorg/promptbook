import { BaseEmbedding } from 'llamaindex';
import OpenAI from 'openai';
import { spaceTrim } from '../../../../../src/_packages/utils.index';
import { MissingToolsError } from '../../../../../src/errors/MissingToolsError';
import type { string_model_name } from '../../../../../src/types/typeAliases';

/**
 * Default embedding model used by the Agents Server LlamaIndex knowledge index.
 */
export const LLAMA_INDEX_EMBEDDING_MODEL_NAME = 'text-embedding-3-small' as string_model_name;

/**
 * Batch size used for OpenAI embedding requests issued by LlamaIndex.
 */
const LLAMA_INDEX_EMBEDDING_BATCH_SIZE = 64;

/**
 * LlamaIndex embedding adapter backed by OpenAI embeddings.
 *
 * This intentionally uses only the embeddings endpoint, not OpenAI vector stores.
 */
export class OpenAiLlamaIndexEmbedding extends BaseEmbedding {
    private readonly client: OpenAI;
    private readonly modelName: string_model_name;

    /**
     * Creates an embedding model for LlamaIndex.
     */
    public constructor(options: {
        readonly apiKey?: string;
        readonly modelName?: string_model_name;
    } = {}) {
        super();

        const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new MissingToolsError(
                spaceTrim(`
                    OpenAI API key is required to build the local LlamaIndex knowledge index.

                    Set \`OPENAI_API_KEY\` in the Agents Server environment.
                `),
            );
        }

        this.client = new OpenAI({ apiKey });
        this.modelName = options.modelName ?? LLAMA_INDEX_EMBEDDING_MODEL_NAME;
        this.embedBatchSize = LLAMA_INDEX_EMBEDDING_BATCH_SIZE;
    }

    /**
     * Embeds one text string.
     */
    public async getTextEmbedding(text: string): Promise<number[]> {
        const [embedding] = await this.getTextEmbeddings([text]);
        return embedding || [];
    }

    /**
     * Embeds text strings in a single OpenAI embeddings call.
     */
    public override getTextEmbeddings = async (texts: string[]): Promise<Array<number[]>> => {
        if (texts.length === 0) {
            return [];
        }

        const response = await this.client.embeddings.create({
            model: this.modelName,
            input: texts,
        });

        return [...response.data]
            .sort((left, right) => left.index - right.index)
            .map((entry) => entry.embedding);
    };
}
