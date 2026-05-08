import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { $provideServer } from '@/src/tools/$provideServer';
import type { TODO_any } from '@promptbook-local/types';
import { spaceTrim } from '../../../../../src/_packages/utils.index';
import { UnexpectedError } from '../../../../../src/errors/UnexpectedError';
import type { string_date_iso8601 } from '../../../../../src/types/typeAliases';

/**
 * Database table containing serialized LlamaIndex knowledge indexes.
 */
const KNOWLEDGE_INDEX_CACHE_TABLE = 'KnowledgeIndexCache';

/**
 * Database table containing per-source content hashes.
 */
const KNOWLEDGE_SOURCE_HASH_TABLE = 'KnowledgeSourceHashes';

/**
 * Serialized LlamaIndex stores cached in the database.
 */
export type KnowledgeIndexCachePayload = {
    readonly version: string;
    readonly docStore: TODO_any;
    readonly indexStore: TODO_any;
    readonly vectorStore: TODO_any;
};

/**
 * Persisted LlamaIndex index cache row.
 */
export type KnowledgeIndexCacheRecord = {
    readonly hash: string;
    readonly embeddingModel: string;
    readonly sourceCount: number;
    readonly documentCount: number;
    readonly nodeCount: number;
    readonly payload: KnowledgeIndexCachePayload;
};

/**
 * Persisted content hash for one knowledge source.
 */
export type KnowledgeSourceHashRecord = {
    readonly source: string;
    readonly hash: string;
    readonly etag: string | null;
    readonly lastModified: string | null;
    readonly sizeBytes: number | null;
};

/**
 * Database access layer for LlamaIndex knowledge indexing.
 */
export class KnowledgeIndexCacheRepository {
    private readonly tablePrefix: string | undefined;
    private readonly isVerbose: boolean;

    /**
     * Creates a repository bound either to the current request server or an explicit table prefix.
     */
    public constructor(options: { readonly tablePrefix?: string; readonly isVerbose?: boolean } = {}) {
        this.tablePrefix = options.tablePrefix;
        this.isVerbose = options.isVerbose ?? false;
    }

    /**
     * Reads one cached LlamaIndex payload by hash.
     */
    public async getKnowledgeIndexCache(hash: string): Promise<KnowledgeIndexCacheRecord | null> {
        const supabase = $provideSupabaseForServer() as TODO_any;
        const { data, error } = await supabase
            .from(await this.getTableName(KNOWLEDGE_INDEX_CACHE_TABLE))
            .select('hash, embeddingModel, sourceCount, documentCount, nodeCount, payload')
            .eq('hash', hash)
            .maybeSingle();

        if (error) {
            if (this.isVerbose) {
                console.error('[knowledge-index] cache lookup failed', { hash, error });
            }

            return null;
        }

        if (!data) {
            return null;
        }

        return {
            hash: data.hash,
            embeddingModel: data.embeddingModel,
            sourceCount: data.sourceCount,
            documentCount: data.documentCount,
            nodeCount: data.nodeCount,
            payload: data.payload,
        };
    }

    /**
     * Stores one serialized LlamaIndex payload.
     */
    public async upsertKnowledgeIndexCache(record: KnowledgeIndexCacheRecord): Promise<void> {
        const supabase = $provideSupabaseForServer() as TODO_any;
        const { error } = await supabase
            .from(await this.getTableName(KNOWLEDGE_INDEX_CACHE_TABLE))
            .upsert(
                {
                    hash: record.hash,
                    embeddingModel: record.embeddingModel,
                    sourceCount: record.sourceCount,
                    documentCount: record.documentCount,
                    nodeCount: record.nodeCount,
                    payload: record.payload,
                    updatedAt: new Date().toISOString() as string_date_iso8601,
                },
                { onConflict: 'hash' },
        );

        if (error) {
            throw new UnexpectedError(
                spaceTrim(`
                    Failed to store LlamaIndex knowledge cache.

                    - Index hash: \`${record.hash}\`
                    - Error: \`${error.message || String(error)}\`
                `),
            );
        }
    }

    /**
     * Reads one cached source-content hash.
     */
    public async getKnowledgeSourceHash(source: string): Promise<KnowledgeSourceHashRecord | null> {
        const supabase = $provideSupabaseForServer() as TODO_any;
        const { data, error } = await supabase
            .from(await this.getTableName(KNOWLEDGE_SOURCE_HASH_TABLE))
            .select('source, hash, etag, lastModified, sizeBytes')
            .eq('source', source)
            .maybeSingle();

        if (error) {
            if (this.isVerbose) {
                console.warn('[knowledge-index] source hash lookup failed', { source, error });
            }

            return null;
        }

        if (!data) {
            return null;
        }

        return {
            source: data.source,
            hash: data.hash,
            etag: data.etag,
            lastModified: data.lastModified,
            sizeBytes: data.sizeBytes,
        };
    }

    /**
     * Stores one source-content hash.
     */
    public async upsertKnowledgeSourceHash(record: KnowledgeSourceHashRecord): Promise<void> {
        const supabase = $provideSupabaseForServer() as TODO_any;
        const { error } = await supabase
            .from(await this.getTableName(KNOWLEDGE_SOURCE_HASH_TABLE))
            .upsert(
                {
                    source: record.source,
                    hash: record.hash,
                    etag: record.etag,
                    lastModified: record.lastModified,
                    sizeBytes: record.sizeBytes,
                    updatedAt: new Date().toISOString() as string_date_iso8601,
                },
                { onConflict: 'source' },
            );

        if (error && this.isVerbose) {
            console.warn('[knowledge-index] source hash upsert failed', {
                source: record.source,
                error,
            });
        }
    }

    /**
     * Resolves a prefixed Agents Server table name.
     */
    private async getTableName(tableName: string): Promise<string> {
        if (this.tablePrefix !== undefined) {
            return `${this.tablePrefix}${tableName}`;
        }

        const server = await $provideServer();
        return `${server.tablePrefix}${tableName}`;
    }
}
