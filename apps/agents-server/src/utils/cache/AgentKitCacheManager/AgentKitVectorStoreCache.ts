import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { TODO_any } from '@promptbook-local/types';
import type { OpenAiAgentKitExecutionTools } from '../../../../../../src/llm-providers/openai/OpenAiAgentKitExecutionTools';
import { createAgentKitVectorStoreNote } from './createAgentKitVectorStoreNote';

/**
 * Constant for vector store external type.
 *
 * @private function of AgentKitCacheManager
 */
const VECTOR_STORE_EXTERNAL_TYPE = 'VECTOR_STORE';

/**
 * Database-backed cache for durable OpenAI vector stores.
 *
 * @private function of AgentKitCacheManager
 */
export class AgentKitVectorStoreCache {
    private readonly isVerbose: boolean;

    /**
     * Creates a new AgentKitVectorStoreCache.
     */
    public constructor(options: { isVerbose?: boolean } = {}) {
        this.isVerbose = options.isVerbose ?? false;
    }

    /**
     * Retrieves a cached vector store ID for the given hash.
     */
    public async getCachedVectorStoreId(
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
                console.error('[🤰]', 'AgentKit cache lookup failed', {
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
                console.warn('[🤰]', 'Cached vector store not found, invalidating cache', {
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
    public async cacheVectorStore(options: {
        readonly vectorStoreHash: string;
        readonly vectorStoreId: string;
        readonly agentName: string;
        readonly knowledgeSources: ReadonlyArray<string>;
    }): Promise<void> {
        const note = createAgentKitVectorStoreNote({
            agentName: options.agentName,
            knowledgeSources: options.knowledgeSources,
        });
        const supabase = $provideSupabaseForServer();
        const { error: insertError } = await supabase.from(await $getTableName('AgentExternals')).insert({
            type: VECTOR_STORE_EXTERNAL_TYPE,
            hash: options.vectorStoreHash,
            externalId: options.vectorStoreId,
            vendor: 'openai',
            note,
        });

        if (insertError && insertError.code !== '23505') {
            console.error('[🤰]', 'AgentKit cache update failed', {
                vectorStoreHash: options.vectorStoreHash,
                vectorStoreId: options.vectorStoreId,
                error: insertError,
            });
        } else if (this.isVerbose) {
            console.info('[🤰]', 'AgentKit vector store cached', {
                vectorStoreHash: options.vectorStoreHash,
                vectorStoreId: options.vectorStoreId,
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
            console.error('[🤰]', 'AgentKit cache invalidation failed', {
                vectorStoreHash,
                error: deleteError,
            });
        } else if (this.isVerbose) {
            console.info('[🤰]', 'AgentKit cache invalidated', { vectorStoreHash });
        }
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
}
