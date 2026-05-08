import {
    MetadataMode,
    Settings,
    VectorStoreIndex,
    type NodeWithScore,
} from 'llamaindex';
import { SimpleDocumentStore, storageContextFromDefaults } from 'llamaindex/storage';
import { SimpleVectorStore } from 'llamaindex/vector-store';
import { SimpleIndexStore } from '@llamaindex/core/storage/index-store';
import { spaceTrim } from '../../../../../src/_packages/utils.index';
import { UnexpectedError } from '../../../../../src/errors/UnexpectedError';
import type { string_model_name } from '../../../../../src/types/typeAliases';
import {
    KnowledgeIndexCacheRepository,
    type KnowledgeIndexCachePayload,
    type KnowledgeIndexCacheRecord,
} from './KnowledgeIndexCacheRepository';
import { KNOWLEDGE_INDEX_HASH_VERSION, KnowledgeSourceHasher } from './KnowledgeSourceHasher';
import {
    loadKnowledgeDocumentsForLlamaIndex,
    type KnowledgeDocumentMetadata,
} from './loadKnowledgeDocumentsForLlamaIndex';
import {
    LLAMA_INDEX_EMBEDDING_MODEL_NAME,
    OpenAiLlamaIndexEmbedding,
} from './OpenAiLlamaIndexEmbedding';
import type { KnowledgeSearchResult, KnowledgeSearchToolResult } from './KnowledgeSearchResult';

/**
 * Version stored inside serialized LlamaIndex payloads.
 */
const KNOWLEDGE_INDEX_CACHE_PAYLOAD_VERSION = 'llama-index-cache-v1';

/**
 * Default number of search results returned by `knowledge_search`.
 */
const DEFAULT_KNOWLEDGE_SEARCH_LIMIT = 5;

/**
 * Maximum number of search results returned by `knowledge_search`.
 */
const MAX_KNOWLEDGE_SEARCH_LIMIT = 10;

/**
 * LlamaIndex text chunk size used for the knowledge index.
 */
export const KNOWLEDGE_INDEX_CHUNK_SIZE = 1024;

/**
 * Maximum excerpt length returned to the model.
 */
const MAX_KNOWLEDGE_SEARCH_EXCERPT_LENGTH = 1_200;

/**
 * In-flight background index preparations keyed by knowledge index hash.
 */
const PENDING_KNOWLEDGE_INDEX_PREPARATIONS = new Map<string, Promise<void>>();

/**
 * Result of preparing the cached index.
 */
export type KnowledgeIndexPreparationResult =
    | {
          readonly status: 'prepared' | 'cached';
          readonly hash: string;
          readonly sourceCount: number;
          readonly documentCount: number;
          readonly nodeCount: number;
      }
    | {
          readonly status: 'empty';
      };

/**
 * DB-backed LlamaIndex manager for Agents Server `KNOWLEDGE` search.
 */
export class KnowledgeIndexCacheManager {
    private readonly repository: KnowledgeIndexCacheRepository;
    private readonly hasher: KnowledgeSourceHasher;
    private readonly isVerbose: boolean;
    private readonly embeddingModelName: string_model_name;

    /**
     * Creates a knowledge index manager.
     */
    public constructor(options: {
        readonly tablePrefix?: string;
        readonly isVerbose?: boolean;
        readonly repository?: KnowledgeIndexCacheRepository;
        readonly hasher?: KnowledgeSourceHasher;
        readonly embeddingModelName?: string_model_name;
    } = {}) {
        this.repository =
            options.repository ||
            new KnowledgeIndexCacheRepository({
                tablePrefix: options.tablePrefix,
                isVerbose: options.isVerbose,
            });
        this.hasher =
            options.hasher ||
            new KnowledgeSourceHasher({
                tablePrefix: options.tablePrefix,
                isVerbose: options.isVerbose,
                repository: this.repository,
            });
        this.isVerbose = options.isVerbose ?? false;
        this.embeddingModelName = options.embeddingModelName ?? LLAMA_INDEX_EMBEDDING_MODEL_NAME;
    }

    /**
     * Builds and stores a LlamaIndex index unless an up-to-date cache row already exists.
     */
    public async prepareKnowledgeIndex(options: {
        readonly agentName: string;
        readonly knowledgeSources: ReadonlyArray<string>;
    }): Promise<KnowledgeIndexPreparationResult> {
        const hashResult = await this.hasher.computeKnowledgeIndexHash(options);

        if (!hashResult) {
            return { status: 'empty' };
        }

        const cachedIndex = await this.repository.getKnowledgeIndexCache(hashResult.hash);

        if (cachedIndex && cachedIndex.payload.version === KNOWLEDGE_INDEX_CACHE_PAYLOAD_VERSION) {
            return {
                status: 'cached',
                hash: cachedIndex.hash,
                sourceCount: cachedIndex.sourceCount,
                documentCount: cachedIndex.documentCount,
                nodeCount: cachedIndex.nodeCount,
            };
        }

        const documents = await loadKnowledgeDocumentsForLlamaIndex({
            knowledgeSources: options.knowledgeSources,
            isVerbose: this.isVerbose,
        });

        if (documents.length === 0) {
            return { status: 'empty' };
        }

        const embedModel = this.createEmbeddingModel();
        const docStore = new SimpleDocumentStore();
        const indexStore = new SimpleIndexStore();
        const vectorStore = new SimpleVectorStore({ embedModel });
        const storageContext = await storageContextFromDefaults({
            docStore,
            indexStore,
            vectorStore,
        });

        await Settings.withEmbedModel(embedModel, async () =>
            Settings.withChunkSize(KNOWLEDGE_INDEX_CHUNK_SIZE, async () => {
                await VectorStoreIndex.fromDocuments(documents, {
                    storageContext,
                    logProgress: this.isVerbose,
                });
            }),
        );

        const payload: KnowledgeIndexCachePayload = {
            version: KNOWLEDGE_INDEX_CACHE_PAYLOAD_VERSION,
            docStore: docStore.toDict(),
            indexStore: indexStore.toDict(),
            vectorStore: vectorStore.toDict(),
        };
        const nodeCount = countVectorStoreNodes(payload.vectorStore);

        await this.repository.upsertKnowledgeIndexCache({
            hash: hashResult.hash,
            embeddingModel: this.embeddingModelName,
            sourceCount: options.knowledgeSources.length,
            documentCount: documents.length,
            nodeCount,
            payload,
        });

        if (this.isVerbose) {
            console.info('[knowledge-index] prepared LlamaIndex cache', {
                agentName: options.agentName,
                hash: hashResult.hash,
                documentCount: documents.length,
                nodeCount,
                hashVersion: KNOWLEDGE_INDEX_HASH_VERSION,
            });
        }

        return {
            status: 'prepared',
            hash: hashResult.hash,
            sourceCount: options.knowledgeSources.length,
            documentCount: documents.length,
            nodeCount,
        };
    }

    /**
     * Searches the cached LlamaIndex index.
     */
    public async searchKnowledgeIndex(options: {
        readonly agentName: string;
        readonly knowledgeSources: ReadonlyArray<string>;
        readonly query: string;
        readonly limit?: number;
    }): Promise<KnowledgeSearchToolResult> {
        const query = options.query.trim();

        if (!query) {
            return {
                status: 'error',
                query,
                results: [],
                message: 'Search query is empty.',
            };
        }

        const hashResult = await this.hasher.computeKnowledgeIndexHash({
            agentName: options.agentName,
            knowledgeSources: options.knowledgeSources,
        });

        if (!hashResult) {
            return {
                status: 'empty',
                query,
                results: [],
                message: 'This agent has no configured knowledge sources.',
            };
        }

        const cachedIndex = await this.repository.getKnowledgeIndexCache(hashResult.hash);

        if (!cachedIndex || cachedIndex.payload.version !== KNOWLEDGE_INDEX_CACHE_PAYLOAD_VERSION) {
            this.prepareKnowledgeIndexInBackground({
                agentName: options.agentName,
                knowledgeSources: options.knowledgeSources,
                expectedHash: hashResult.hash,
            });

            return {
                status: 'indexing',
                query,
                results: [],
                indexHash: hashResult.hash,
                message: 'Knowledge index is still being prepared. Try the search again after indexing finishes.',
            };
        }

        const index = await this.restoreVectorStoreIndex(cachedIndex);
        const retriever = index.asRetriever({
            similarityTopK: normalizeKnowledgeSearchLimit(options.limit),
        });
        const nodesWithScore = await retriever.retrieve(query);
        const results = nodesWithScore.map((nodeWithScore, index) =>
            createKnowledgeSearchResult(nodeWithScore, index),
        );

        return {
            status: 'ready',
            query,
            indexHash: cachedIndex.hash,
            results,
        };
    }

    /**
     * Restores a LlamaIndex vector index from the serialized database payload.
     */
    private async restoreVectorStoreIndex(record: KnowledgeIndexCacheRecord): Promise<VectorStoreIndex> {
        if (record.payload.version !== KNOWLEDGE_INDEX_CACHE_PAYLOAD_VERSION) {
            throw new UnexpectedError(
                spaceTrim(`
                    Unsupported LlamaIndex knowledge cache payload.

                    - Expected version: \`${KNOWLEDGE_INDEX_CACHE_PAYLOAD_VERSION}\`
                    - Received version: \`${record.payload.version}\`
                    - Index hash: \`${record.hash}\`
                `),
            );
        }

        const embedModel = this.createEmbeddingModel();
        const docStore = SimpleDocumentStore.fromDict(record.payload.docStore);
        const indexStore = SimpleIndexStore.fromDict(record.payload.indexStore);
        const vectorStore = SimpleVectorStore.fromDict(record.payload.vectorStore as never, embedModel);
        const storageContext = await storageContextFromDefaults({
            docStore,
            indexStore,
            vectorStore,
        });

        return Settings.withEmbedModel(embedModel, async () =>
            Settings.withChunkSize(KNOWLEDGE_INDEX_CHUNK_SIZE, async () =>
                VectorStoreIndex.init({
                    storageContext,
                }),
            ),
        );
    }

    /**
     * Creates the embedding adapter used by LlamaIndex.
     */
    private createEmbeddingModel(): OpenAiLlamaIndexEmbedding {
        return new OpenAiLlamaIndexEmbedding({
            modelName: this.embeddingModelName,
        });
    }

    /**
     * Starts a best-effort background index preparation after a search-time cache miss.
     */
    private prepareKnowledgeIndexInBackground(options: {
        readonly agentName: string;
        readonly knowledgeSources: ReadonlyArray<string>;
        readonly expectedHash: string;
    }): void {
        if (PENDING_KNOWLEDGE_INDEX_PREPARATIONS.has(options.expectedHash)) {
            return;
        }

        const pendingPreparation = this.prepareKnowledgeIndex({
            agentName: options.agentName,
            knowledgeSources: options.knowledgeSources,
        })
            .then(() => undefined)
            .catch((error) => {
                console.error('[knowledge-index] Background LlamaIndex preparation failed', {
                    agentName: options.agentName,
                    indexHash: options.expectedHash,
                    error,
                });
            })
            .finally(() => {
                PENDING_KNOWLEDGE_INDEX_PREPARATIONS.delete(options.expectedHash);
            });

        PENDING_KNOWLEDGE_INDEX_PREPARATIONS.set(options.expectedHash, pendingPreparation);
    }
}

/**
 * Creates a tool result from one retrieved LlamaIndex node.
 */
function createKnowledgeSearchResult(
    nodeWithScore: NodeWithScore,
    index: number,
): KnowledgeSearchResult {
    const metadata = normalizeKnowledgeDocumentMetadata(nodeWithScore.node.metadata);
    const id = `${index}:0`;

    return {
        id,
        citation: `[${id}]`,
        source: metadata.sourceTitle || metadata.source,
        ...(metadata.sourceUrl ? { url: metadata.sourceUrl } : {}),
        excerpt: createKnowledgeSearchExcerpt(nodeWithScore.node.getContent(MetadataMode.NONE)),
        ...(typeof nodeWithScore.score === 'number' ? { score: nodeWithScore.score } : {}),
    };
}

/**
 * Normalizes LlamaIndex metadata into the shape produced by the document loader.
 */
function normalizeKnowledgeDocumentMetadata(metadata: Record<string, unknown>): KnowledgeDocumentMetadata {
    return {
        source: normalizeOptionalString(metadata.source) || 'Knowledge source',
        sourceTitle:
            normalizeOptionalString(metadata.sourceTitle) ||
            normalizeOptionalString(metadata.source) ||
            'Knowledge source',
        sourceUrl: normalizeOptionalString(metadata.sourceUrl),
        originalSource: normalizeOptionalString(metadata.originalSource),
    };
}

/**
 * Creates one concise excerpt for the model and source chips.
 */
function createKnowledgeSearchExcerpt(content: string): string {
    const normalizedContent = content.replace(/\s+/g, ' ').trim();

    if (normalizedContent.length <= MAX_KNOWLEDGE_SEARCH_EXCERPT_LENGTH) {
        return normalizedContent;
    }

    return `${normalizedContent.slice(0, MAX_KNOWLEDGE_SEARCH_EXCERPT_LENGTH - 3)}...`;
}

/**
 * Normalizes the requested search limit.
 */
function normalizeKnowledgeSearchLimit(limit: number | undefined): number {
    if (!Number.isInteger(limit)) {
        return DEFAULT_KNOWLEDGE_SEARCH_LIMIT;
    }

    const requestedLimit = limit as number;
    return Math.min(Math.max(requestedLimit, 1), MAX_KNOWLEDGE_SEARCH_LIMIT);
}

/**
 * Counts vector nodes stored in a serialized SimpleVectorStore payload.
 */
function countVectorStoreNodes(vectorStore: Record<string, unknown>): number {
    const embeddingDict = vectorStore.embeddingDict;

    if (!embeddingDict || typeof embeddingDict !== 'object' || Array.isArray(embeddingDict)) {
        return 0;
    }

    return Object.keys(embeddingDict).length;
}

/**
 * Normalizes an optional string metadata value.
 */
function normalizeOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed || undefined;
}
