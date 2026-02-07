import { createHash } from 'crypto';
import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { createAgentModelRequirements } from '@promptbook-local/core';
import { AgentModelRequirements, string_agent_permanent_id, string_book, TODO_any } from '@promptbook-local/types';
import { OpenAiAgentKitExecutionTools } from '../../../../../src/llm-providers/openai/OpenAiAgentKitExecutionTools';
import {
    AssistantConfiguration,
    computeAssistantCacheKey,
    extractAssistantConfiguration,
    formatAssistantNameWithHash,
} from './computeAssistantCacheKey';

const KNOWLEDGE_SOURCE_HASH_TIMEOUT_MS = 30000;
const VECTOR_STORE_HASH_VERSION = 'vector-store-v1';

/**
 * Supported external types stored in AgentExternals.
 */
type AgentExternalType = 'VECTOR_STORE';

const VECTOR_STORE_EXTERNAL_TYPE: AgentExternalType = 'VECTOR_STORE';

/**
 * Result of getting or creating an AgentKit-backed agent.
 */
export type AgentKitCacheResult = {
    /**
     * The OpenAI AgentKit execution tools instance.
     */
    readonly tools: OpenAiAgentKitExecutionTools;

    /**
     * Whether cached vector store metadata was reused.
     */
    readonly fromCache: boolean;

    /**
     * Cache key derived from the assistant configuration.
     */
    readonly assistantCacheKey: string;

    /**
     * Hash of the knowledge source file contents used for the vector store.
     */
    readonly vectorStoreHash: string | null;

    /**
     * The agent configuration used to compute the assistant cache key.
     */
    readonly configuration: AssistantConfiguration;

    /**
     * Vector store ID attached to the AgentKit agent (if any).
     */
    readonly vectorStoreId?: string;
};

/**
 * Manages the lifecycle of OpenAI AgentKit agents with vector store caching.
 *
 * The caching strategy stores vector store identifiers in AgentExternals so
 * knowledge uploads are reused across agents that share the same files.
 */
export class AgentKitCacheManager {
    private readonly isVerbose: boolean;

    /**
     * Creates a new AgentKitCacheManager.
     */
    public constructor(options: { isVerbose?: boolean } = {}) {
        this.isVerbose = options.isVerbose ?? false;
    }

    /**
     * Gets an existing AgentKit vector store from cache or creates a new one.
     *
     * Dynamic CONTEXT lines are included in the assistant cache key by default; set
     * includeDynamicContext to false to ignore them. Vector store caching is based
     * solely on knowledge source file contents.
     *
     * @param agentSource - The agent source (may include dynamic CONTEXT lines)
     * @param agentName - The agent name for logging and fallback
     * @param baseTools - Base OpenAI AgentKit execution tools instance
     * @param options - Cache options
     * @returns AgentKit cache result with tools and metadata
     */
    public async getOrCreateAgentKitAgent(
        agentSource: string_book,
        agentName: string,
        baseTools: OpenAiAgentKitExecutionTools,
        options: {
            /**
             * Whether to include dynamic CONTEXT in the assistant cache key (default: true for backward compatibility).
             */
            includeDynamicContext?: boolean;

            /**
             * The agent permanent ID for logging.
             */
            agentId?: string_agent_permanent_id;

            /**
             * Optional callback invoked before creating a new vector store on cache miss.
             */
            onCacheMiss?: () => void | Promise<void>;
        } = {},
    ): Promise<AgentKitCacheResult> {
        const { includeDynamicContext = true, agentId, onCacheMiss } = options;

        const configuration = extractAssistantConfiguration(agentSource, { includeDynamicContext });
        const assistantCacheKey = computeAssistantCacheKey(configuration);

        if (this.isVerbose) {
            console.info('[??]', 'Resolving AgentKit cache key', {
                agentName,
                assistantCacheKey,
                includeDynamicContext,
                instructionsLength: configuration.instructions.length,
                baseSourceLength: configuration.baseAgentSource.length,
                agentId,
            });
        }

        const modelRequirements: AgentModelRequirements = await createAgentModelRequirements(
            configuration.baseAgentSource,
        );
        const knowledgeSources = modelRequirements.knowledgeSources ? [...modelRequirements.knowledgeSources] : [];
        const tools = modelRequirements.tools ? [...modelRequirements.tools] : undefined;
        const agentKitName = formatAssistantNameWithHash(configuration.name || agentName, assistantCacheKey);

        const vectorStoreHash = await this.computeVectorStoreHash({ agentName, knowledgeSources });
        const cachedVectorStoreId = vectorStoreHash
            ? await this.getCachedVectorStoreId(vectorStoreHash, baseTools)
            : null;

        if (cachedVectorStoreId && this.isVerbose) {
            console.info('[??]', 'AgentKit cache hit (vector store)', {
                agentName,
                assistantCacheKey,
                vectorStoreHash,
                vectorStoreId: cachedVectorStoreId,
            });
        }

        if (!cachedVectorStoreId && knowledgeSources.length > 0 && onCacheMiss) {
            await onCacheMiss();
        }

        if (this.isVerbose) {
            console.info('[??]', 'Preparing AgentKit agent via cache manager', {
                agentName,
                agentKitName,
                instructionsLength: modelRequirements.systemMessage.length,
                knowledgeSourcesCount: knowledgeSources.length,
                toolsCount: tools?.length ?? 0,
            });
        }

        const preparedAgent = await baseTools.prepareAgentKitAgent({
            name: agentKitName,
            instructions: modelRequirements.systemMessage,
            knowledgeSources,
            tools,
            vectorStoreId: cachedVectorStoreId ?? undefined,
        });

        if (!cachedVectorStoreId && preparedAgent.vectorStoreId && vectorStoreHash) {
            await this.cacheVectorStore(vectorStoreHash, preparedAgent.vectorStoreId);
        }

        return {
            tools: baseTools.getPreparedAgentTools(preparedAgent),
            fromCache: Boolean(cachedVectorStoreId),
            assistantCacheKey,
            vectorStoreHash,
            configuration,
            vectorStoreId: preparedAgent.vectorStoreId,
        };
    }

    /**
     * Computes a stable hash for the knowledge sources used by vector stores.
     *
     * @param options - Hash options
     * @param options.agentName - Agent name for logging context
     * @param options.knowledgeSources - Knowledge source URLs to hash
     * @returns Hash for the vector store contents, or null when there are no sources
     */
    private async computeVectorStoreHash(options: {
        readonly agentName: string;
        readonly knowledgeSources: ReadonlyArray<string>;
    }): Promise<string | null> {
        const { agentName, knowledgeSources } = options;

        if (knowledgeSources.length === 0) {
            return null;
        }

        const contentHashes: string[] = [];

        for (const source of knowledgeSources) {
            if (!this.isRemoteKnowledgeSource(source)) {
                if (this.isVerbose) {
                    console.info('[??]', 'Skipping knowledge source for hash (unsupported)', {
                        agentName,
                        source,
                    });
                }
                continue;
            }

            const sourceHash = await this.hashKnowledgeSourceContent({
                source,
                timeoutMs: KNOWLEDGE_SOURCE_HASH_TIMEOUT_MS,
                agentName,
            });

            if (sourceHash) {
                contentHashes.push(sourceHash);
            }
        }

        const vectorStoreHash = this.buildVectorStoreHash(contentHashes);

        if (this.isVerbose) {
            console.info('[??]', 'Computed vector store hash', {
                agentName,
                vectorStoreHash,
                fileCount: contentHashes.length,
            });
        }

        return vectorStoreHash;
    }

    /**
     * Returns true when the knowledge source is an HTTP(S) URL.
     */
    private isRemoteKnowledgeSource(source: string): boolean {
        return source.startsWith('http://') || source.startsWith('https://');
    }

    /**
     * Hashes the content of a single knowledge source URL.
     *
     * @param options - Hashing options
     * @param options.source - Knowledge source URL
     * @param options.timeoutMs - Download timeout in milliseconds
     * @param options.agentName - Agent name for logging context
     * @returns SHA-256 hash of the content, or null on failure
     */
    private async hashKnowledgeSourceContent(options: {
        readonly source: string;
        readonly timeoutMs: number;
        readonly agentName: string;
    }): Promise<string | null> {
        const { source, timeoutMs, agentName } = options;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const startedAtMs = Date.now();

        if (this.isVerbose) {
            console.info('[??]', 'Hashing knowledge source content', {
                agentName,
                source,
                timeoutMs,
            });
        }

        try {
            const response = await fetch(source, { signal: controller.signal });

            if (!response.ok) {
                console.error('[??]', 'Failed to download knowledge source for hashing', {
                    agentName,
                    source,
                    status: response.status,
                    statusText: response.statusText,
                    elapsedMs: Date.now() - startedAtMs,
                });
                return null;
            }

            const buffer = await response.arrayBuffer();
            const hash = createHash('sha256').update(Buffer.from(buffer)).digest('hex');

            if (this.isVerbose) {
                console.info('[??]', 'Hashed knowledge source content', {
                    agentName,
                    source,
                    sizeBytes: buffer.byteLength,
                    elapsedMs: Date.now() - startedAtMs,
                });
            }

            return hash;
        } catch (error) {
            if (this.isVerbose) {
                console.error('[??]', 'Error hashing knowledge source content', {
                    agentName,
                    source,
                    elapsedMs: Date.now() - startedAtMs,
                    error,
                });
            }
            return null;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Builds a stable vector store hash from individual content hashes.
     */
    private buildVectorStoreHash(contentHashes: ReadonlyArray<string>): string {
        const sortedHashes = [...contentHashes].sort();
        const payload = JSON.stringify({
            version: VECTOR_STORE_HASH_VERSION,
            hashes: sortedHashes,
        });
        return createHash('sha256').update(payload).digest('hex');
    }

    /**
     * Resolves the OpenAI vector stores API surface.
     */
    private getVectorStoresApi(client: TODO_any): TODO_any {
        const vectorStores = client.vectorStores ?? client.beta?.vectorStores;

        if (!vectorStores) {
            throw new Error('OpenAI client does not support vector stores.');
        }

        return vectorStores;
    }

    /**
     * Retrieves a cached vector store ID for the given hash.
     */
    private async getCachedVectorStoreId(
        vectorStoreHash: string,
        baseTools: OpenAiAgentKitExecutionTools,
    ): Promise<string | null> {
        const supabase = $provideSupabaseForServer();
        const { data: cachedData, error: cacheError } = await supabase
            .from(await $getTableName('AgentExternals'))
            .select('externalId')
            .eq('type', VECTOR_STORE_EXTERNAL_TYPE)
            .eq('hash', vectorStoreHash)
            .maybeSingle();

        if (cacheError || !cachedData?.externalId) {
            if (cacheError && this.isVerbose) {
                console.error('[??]', 'AgentKit cache lookup failed', {
                    vectorStoreHash,
                    error: cacheError,
                });
            }
            return null;
        }

        const vectorStoreId = cachedData.externalId;

        try {
            const client = await baseTools.getClient();
            const vectorStores = this.getVectorStoresApi(client as TODO_any);
            await vectorStores.retrieve(vectorStoreId);
            return vectorStoreId;
        } catch (error) {
            if (this.isVerbose) {
                console.warn('[??]', 'Cached vector store not found, invalidating cache', {
                    vectorStoreHash,
                    vectorStoreId,
                });
            }
            await this.invalidateCache(vectorStoreHash);
            return null;
        }
    }

    /**
     * Stores vector store metadata in AgentExternals.
     */
    private async cacheVectorStore(vectorStoreHash: string, vectorStoreId: string): Promise<void> {
        const supabase = $provideSupabaseForServer();
        const { error: insertError } = await supabase.from(await $getTableName('AgentExternals')).insert({
            type: VECTOR_STORE_EXTERNAL_TYPE,
            hash: vectorStoreHash,
            externalId: vectorStoreId,
        });

        if (insertError && insertError.code !== '23505') {
            console.error('[??]', 'AgentKit cache update failed', {
                vectorStoreHash,
                vectorStoreId,
                error: insertError,
            });
        } else if (this.isVerbose) {
            console.info('[??]', 'AgentKit vector store cached', {
                vectorStoreHash,
                vectorStoreId,
            });
        }
    }

    /**
     * Invalidates cache for a specific vector store hash.
     */
    public async invalidateCache(vectorStoreHash: string): Promise<void> {
        const supabase = $provideSupabaseForServer();
        const { error: deleteError } = await supabase
            .from(await $getTableName('AgentExternals'))
            .delete()
            .eq('type', VECTOR_STORE_EXTERNAL_TYPE)
            .eq('hash', vectorStoreHash);

        if (deleteError) {
            console.error('[??]', 'AgentKit cache invalidation failed', {
                vectorStoreHash,
                error: deleteError,
            });
        } else if (this.isVerbose) {
            console.info('[??]', 'AgentKit cache invalidated', { vectorStoreHash });
        }
    }
}
