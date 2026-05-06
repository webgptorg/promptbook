import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import type { Json } from '@/src/database/schema';
import { resolveWebsiteKnowledgeSourcesForServer } from '@/src/utils/knowledge/resolveWebsiteKnowledgeSourcesForServer';
import { prepareKnowledgePieces } from '@promptbook-local/core';
import { createHash } from 'crypto';
import { OpenAIEmbedding } from '@llamaindex/openai';
import { SimpleIndexStore } from '@llamaindex/core/storage/index-store';
import { Document, MetadataMode } from '@llamaindex/core/schema';
import { storageContextFromDefaults, SimpleDocumentStore } from 'llamaindex/storage';
import { Settings, VectorStoreIndex } from 'llamaindex';
import { SimpleVectorStore } from 'llamaindex/vector-store';
import type { string_knowledge_source_link } from '../../../../../src/types/typeAliases';
import { simplifyKnowledgeLabel } from '../../../../../src/utils/knowledge/simplifyKnowledgeLabel';
import type { KnowledgeToolSource } from '../../../../../src/commitments/KNOWLEDGE/KnowledgeToolRuntimeAdapter';
import { $provideExecutionToolsForServer } from '../../tools/$provideExecutionToolsForServer';
import { AgentKitKnowledgeSourceHasher } from '../cache/AgentKitCacheManager/AgentKitKnowledgeSourceHasher';

/**
 * Maximum number of knowledge retrieval results returned to the model.
 *
 * @private const of KnowledgeSearchIndexManager
 */
const MAX_KNOWLEDGE_SEARCH_RESULTS = 8;

/**
 * Database row persisted for one agent knowledge index snapshot.
 *
 * @private type of KnowledgeSearchIndexManager
 */
type KnowledgeIndexSnapshotRow = {
    agentPermanentId: string;
    knowledgeHash: string;
    knowledgeSources: Json;
    documentCount: number;
    documentStore: Json | null;
    indexStore: Json | null;
    vectorStore: Json | null;
};

/**
 * Input for building or querying one agent knowledge index.
 *
 * @private type of KnowledgeSearchIndexManager
 */
type AgentKnowledgeIndexOptions = {
    agentPermanentId: string;
    agentName: string;
    knowledgeSources: ReadonlyArray<string_knowledge_source_link>;
};

/**
 * Minimal prepared knowledge-piece shape required for LlamaIndex document creation.
 *
 * @private type of KnowledgeSearchIndexManager
 */
type PreparedKnowledgePiece = {
    name?: string;
    title?: string;
    content?: string;
    sources: ReadonlyArray<{
        name: string;
    }>;
};

/**
 * Database-backed LlamaIndex manager used for agent knowledge search.
 */
export class KnowledgeSearchIndexManager {
    private readonly isVerbose: boolean;
    private readonly knowledgeSourceHasher: AgentKitKnowledgeSourceHasher;

    /**
     * Creates a new KnowledgeSearchIndexManager.
     */
    public constructor(options: { isVerbose?: boolean } = {}) {
        this.isVerbose = options.isVerbose ?? false;
        this.knowledgeSourceHasher = new AgentKitKnowledgeSourceHasher(options);
    }

    /**
     * Ensures a persisted LlamaIndex snapshot exists for the current agent knowledge sources.
     */
    public async ensureKnowledgeIndexSnapshot(options: AgentKnowledgeIndexOptions): Promise<string | null> {
        if (options.knowledgeSources.length === 0) {
            await this.deleteKnowledgeIndexSnapshot(options.agentPermanentId);
            return null;
        }

        const knowledgeHash = await this.knowledgeSourceHasher.computeVectorStoreHash({
            agentName: options.agentName,
            knowledgeSources: options.knowledgeSources,
        });

        if (!knowledgeHash) {
            await this.deleteKnowledgeIndexSnapshot(options.agentPermanentId);
            return null;
        }

        const existingSnapshot = await this.loadKnowledgeIndexSnapshot(options.agentPermanentId);
        if (existingSnapshot?.knowledgeHash === knowledgeHash) {
            return knowledgeHash;
        }

        const builtSnapshot = await this.buildKnowledgeIndexSnapshot({
            ...options,
            knowledgeHash,
        });

        await this.upsertKnowledgeIndexSnapshot({
            agentPermanentId: options.agentPermanentId,
            knowledgeHash,
            knowledgeSources: options.knowledgeSources as unknown as Json,
            documentCount: builtSnapshot.documentCount,
            documentStore: builtSnapshot.documentStore,
            indexStore: builtSnapshot.indexStore,
            vectorStore: builtSnapshot.vectorStore,
        });

        return knowledgeHash;
    }

    /**
     * Searches one prepared agent knowledge index and returns normalized source snippets.
     */
    public async searchKnowledge(options: {
        agentPermanentId: string;
        agentName: string;
        query: string;
        limit?: number;
        fallbackKnowledgeSources?: ReadonlyArray<string_knowledge_source_link>;
    }): Promise<KnowledgeToolSource[]> {
        let snapshot = await this.loadKnowledgeIndexSnapshot(options.agentPermanentId);

        if (!snapshot && options.fallbackKnowledgeSources && options.fallbackKnowledgeSources.length > 0) {
            await this.ensureKnowledgeIndexSnapshot({
                agentPermanentId: options.agentPermanentId,
                agentName: options.agentName,
                knowledgeSources: options.fallbackKnowledgeSources,
            });

            snapshot = await this.loadKnowledgeIndexSnapshot(options.agentPermanentId);
        }

        if (!snapshot || snapshot.documentCount === 0 || !snapshot.documentStore || !snapshot.indexStore || !snapshot.vectorStore) {
            return [];
        }

        const knowledgeEmbedModel = createKnowledgeEmbedModel();
        const documentStoreDict = snapshot.documentStore as unknown as Parameters<typeof SimpleDocumentStore.fromDict>[0];
        const indexStoreDict = snapshot.indexStore as unknown as Parameters<typeof SimpleIndexStore.fromDict>[0];
        const vectorStoreDict = snapshot.vectorStore as unknown as Parameters<typeof SimpleVectorStore.fromDict>[0];
        const storageContext = await storageContextFromDefaults({
            docStore: SimpleDocumentStore.fromDict(documentStoreDict),
            indexStore: SimpleIndexStore.fromDict(indexStoreDict),
            vectorStore: SimpleVectorStore.fromDict(vectorStoreDict, knowledgeEmbedModel),
        });

        const similarityTopK = Math.max(1, Math.min(MAX_KNOWLEDGE_SEARCH_RESULTS, Math.trunc(options.limit ?? 5)));

        return Settings.withEmbedModel(knowledgeEmbedModel, async () => {
            const index = await VectorStoreIndex.init({
                storageContext,
            });
            const retrievedNodes = await index.asRetriever({ similarityTopK }).retrieve(options.query);

            return deduplicateKnowledgeToolSources(
                retrievedNodes.map(({ node, score }) => ({
                    id: node.id_,
                    name: normalizeKnowledgeSourceName(node.metadata?.sourceName, 'Knowledge source'),
                    url: normalizeOptionalText(node.metadata?.sourceUrl),
                    excerpt: truncateKnowledgeExcerpt(node.getContent(MetadataMode.NONE).trim()),
                    score: typeof score === 'number' ? score : undefined,
                })),
            );
        });
    }

    /**
     * Loads one persisted knowledge snapshot for an agent.
     *
     * @private function of KnowledgeSearchIndexManager
     */
    private async loadKnowledgeIndexSnapshot(agentPermanentId: string): Promise<KnowledgeIndexSnapshotRow | null> {
        const supabase = $provideSupabaseForServer();
        const { data, error } = await supabase
            .from(await $getTableName('KnowledgeIndexSnapshot'))
            .select('agentPermanentId, knowledgeHash, knowledgeSources, documentCount, documentStore, indexStore, vectorStore')
            .eq('agentPermanentId', agentPermanentId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return (data as KnowledgeIndexSnapshotRow | null) ?? null;
    }

    /**
     * Deletes the persisted snapshot when an agent no longer uses KNOWLEDGE.
     *
     * @private function of KnowledgeSearchIndexManager
     */
    private async deleteKnowledgeIndexSnapshot(agentPermanentId: string): Promise<void> {
        const supabase = $provideSupabaseForServer();
        const { error } = await supabase
            .from(await $getTableName('KnowledgeIndexSnapshot'))
            .delete()
            .eq('agentPermanentId', agentPermanentId);

        if (error) {
            throw error;
        }
    }

    /**
     * Upserts the latest persisted snapshot for one agent.
     *
     * @private function of KnowledgeSearchIndexManager
     */
    private async upsertKnowledgeIndexSnapshot(snapshot: KnowledgeIndexSnapshotRow): Promise<void> {
        const supabase = $provideSupabaseForServer();
        const { error } = await supabase.from(await $getTableName('KnowledgeIndexSnapshot')).upsert(snapshot, {
            onConflict: 'agentPermanentId',
        });

        if (error) {
            throw error;
        }
    }

    /**
     * Builds one fresh LlamaIndex snapshot from the normalized knowledge sources.
     *
     * @private function of KnowledgeSearchIndexManager
     */
    private async buildKnowledgeIndexSnapshot(options: AgentKnowledgeIndexOptions & { knowledgeHash: string }): Promise<{
        documentCount: number;
        documentStore: Json | null;
        indexStore: Json | null;
        vectorStore: Json | null;
    }> {
        const resolvedKnowledgeSources = await resolveWebsiteKnowledgeSourcesForServer(options.knowledgeSources, {
            isVerbose: this.isVerbose,
        });
        const namedKnowledgeSources = createNamedKnowledgeSources(options.knowledgeSources, resolvedKnowledgeSources);
        const executionTools = await $provideExecutionToolsForServer();
        const preparedKnowledgePieces = await prepareKnowledgePieces(
            namedKnowledgeSources,
            executionTools,
            {
                isVerbose: this.isVerbose,
            },
        );
        const documents = createKnowledgeDocuments(
            preparedKnowledgePieces,
            namedKnowledgeSources,
            options.agentPermanentId,
            options.knowledgeHash,
        );

        if (documents.length === 0) {
            return {
                documentCount: 0,
                documentStore: null,
                indexStore: null,
                vectorStore: null,
            };
        }

        const knowledgeEmbedModel = createKnowledgeEmbedModel();
        const documentStore = new SimpleDocumentStore();
        const indexStore = new SimpleIndexStore();
        const vectorStore = new SimpleVectorStore({
            embedModel: knowledgeEmbedModel,
        });
        const storageContext = await storageContextFromDefaults({
            docStore: documentStore,
            indexStore,
            vectorStore,
        });

        await Settings.withEmbedModel(knowledgeEmbedModel, async () => {
            await VectorStoreIndex.fromDocuments(documents, {
                storageContext,
            });
        });

        return {
            documentCount: documents.length,
            documentStore: documentStore.toDict() as unknown as Json,
            indexStore: indexStore.toDict() as unknown as Json,
            vectorStore: vectorStore.toDict() as unknown as Json,
        };
    }
}

/**
 * One normalized knowledge source passed into Promptbook scraping.
 *
 * @private type of KnowledgeSearchIndexManager
 */
type NamedKnowledgeSource = {
    name: string;
    knowledgeSourceContent: string_knowledge_source_link;
    originalSource: string_knowledge_source_link;
};

/**
 * Assigns stable, human-readable names to resolved knowledge sources.
 *
 * @private function of KnowledgeSearchIndexManager
 */
function createNamedKnowledgeSources(
    originalKnowledgeSources: ReadonlyArray<string_knowledge_source_link>,
    resolvedKnowledgeSources: ReadonlyArray<string_knowledge_source_link>,
): ReadonlyArray<NamedKnowledgeSource> {
    const usedNames = new Set<string>();

    return resolvedKnowledgeSources.map((resolvedSource, index) => {
        const originalSource = originalKnowledgeSources[index] || resolvedSource;
        const baseName = normalizeKnowledgeSourceName(simplifyKnowledgeLabel(originalSource), `Knowledge source ${index + 1}`);
        let name = baseName;
        let duplicateIndex = 2;

        while (usedNames.has(name)) {
            name = `${baseName} (${duplicateIndex})`;
            duplicateIndex += 1;
        }

        usedNames.add(name);

        return {
            name,
            knowledgeSourceContent: resolvedSource,
            originalSource,
        };
    });
}

/**
 * Converts prepared Promptbook knowledge pieces into LlamaIndex documents.
 *
 * @private function of KnowledgeSearchIndexManager
 */
function createKnowledgeDocuments(
    preparedKnowledgePieces: ReadonlyArray<PreparedKnowledgePiece>,
    knowledgeSources: ReadonlyArray<NamedKnowledgeSource>,
    agentPermanentId: string,
    knowledgeHash: string,
): Document[] {
    const sourceUrlByName = new Map(knowledgeSources.map((knowledgeSource) => [knowledgeSource.name, knowledgeSource.originalSource]));

    return preparedKnowledgePieces.flatMap((piece, index) => {
        const text = createKnowledgeDocumentText(piece);
        if (!text) {
            return [];
        }

        const primarySourceName = normalizeKnowledgeSourceName(piece.sources[0]?.name, `Knowledge source ${index + 1}`);

        return [
            new Document({
                id_: createHash('sha256')
                    .update(`${agentPermanentId}:${knowledgeHash}:${index}:${text}`)
                    .digest('hex'),
                text,
                metadata: {
                    sourceName: primarySourceName,
                    sourceUrl: sourceUrlByName.get(primarySourceName),
                    pieceName: piece.name,
                    title: piece.title,
                },
            }),
        ];
    });
}

/**
 * Builds the text payload stored in one LlamaIndex document.
 *
 * @private function of KnowledgeSearchIndexManager
 */
function createKnowledgeDocumentText(piece: PreparedKnowledgePiece): string {
    const title = normalizeOptionalText(piece.title);
    const content = normalizeOptionalText(piece.content);

    if (!title && !content) {
        return '';
    }

    if (!title) {
        return content || '';
    }

    if (!content) {
        return title;
    }

    return `# ${title}\n\n${content}`;
}

/**
 * Creates the shared embedding model used for LlamaIndex knowledge search.
 *
 * @private function of KnowledgeSearchIndexManager
 */
function createKnowledgeEmbedModel(): OpenAIEmbedding {
    return new OpenAIEmbedding({
        model: 'text-embedding-3-small',
        apiKey: process.env.OPENAI_API_KEY,
    });
}

/**
 * Deduplicates retrieved knowledge sources while keeping the first/highest-ranked occurrence.
 *
 * @private function of KnowledgeSearchIndexManager
 */
function deduplicateKnowledgeToolSources(sources: ReadonlyArray<KnowledgeToolSource>): KnowledgeToolSource[] {
    const deduplicatedSources = new Map<string, KnowledgeToolSource>();

    for (const source of sources) {
        const deduplicationKey = `${source.url || ''}|${source.name}|${source.excerpt || ''}`;

        if (!deduplicatedSources.has(deduplicationKey)) {
            deduplicatedSources.set(deduplicationKey, source);
        }
    }

    return [...deduplicatedSources.values()];
}

/**
 * Trims long knowledge snippets so tool payloads stay readable.
 *
 * @private function of KnowledgeSearchIndexManager
 */
function truncateKnowledgeExcerpt(excerpt: string): string {
    if (excerpt.length <= 900) {
        return excerpt;
    }

    return `${excerpt.slice(0, 897)}...`;
}

/**
 * Normalizes optional string-like values.
 *
 * @private function of KnowledgeSearchIndexManager
 */
function normalizeOptionalText(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalizedValue = value.trim();
    return normalizedValue || undefined;
}

/**
 * Normalizes one knowledge source label with a fallback.
 *
 * @private function of KnowledgeSearchIndexManager
 */
function normalizeKnowledgeSourceName(value: unknown, fallback: string): string {
    return normalizeOptionalText(value) || fallback;
}
