import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { createHash } from 'crypto';

/**
 * Constant for knowledge source hash timeout ms.
 *
 * @private function of AgentKitCacheManager
 */
const KNOWLEDGE_SOURCE_HASH_TIMEOUT_MS = 30_000;

/**
 * Constant for vector store hash version.
 *
 * @private function of AgentKitCacheManager
 */
const VECTOR_STORE_HASH_VERSION = 'vector-store-v1';

/**
 * Constant for vector store source hash table.
 *
 * @private function of AgentKitCacheManager
 */
const VECTOR_STORE_SOURCE_HASH_TABLE = 'VectorStoreKnowledgeSourceHashes';

/**
 * Metadata returned by HEAD requests made against knowledge source URLs.
 *
 * @private function of AgentKitCacheManager
 */
type KnowledgeSourceMetadata = {
    readonly etag?: string | null;
    readonly lastModified?: string | null;
    readonly sizeBytes?: number | null;
};

/**
 * Cached information about a previously hashed knowledge source file.
 *
 * @private function of AgentKitCacheManager
 */
type KnowledgeSourceCacheRecord = {
    readonly source: string;
    readonly hash: string;
    readonly etag: string | null;
    readonly lastModified: string | null;
    readonly sizeBytes: number | null;
};

/**
 * Result of hashing a knowledge source content download.
 *
 * @private function of AgentKitCacheManager
 */
type KnowledgeSourceHashResult = {
    readonly hash: string;
    readonly sizeBytes: number;
    readonly etag: string | null;
    readonly lastModified: string | null;
};

/**
 * Computes stable vector-store hashes from remote knowledge sources.
 *
 * @private function of AgentKitCacheManager
 */
export class AgentKitKnowledgeSourceHasher {
    private readonly isVerbose: boolean;

    /**
     * Creates a new AgentKitKnowledgeSourceHasher.
     */
    public constructor(options: { isVerbose?: boolean } = {}) {
        this.isVerbose = options.isVerbose ?? false;
    }

    /**
     * Computes a stable hash for the knowledge sources used by vector stores.
     */
    public async computeVectorStoreHash(options: {
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
                    console.info('[🤰]', 'Skipping knowledge source for hash (unsupported)', {
                        agentName,
                        source,
                    });
                }
                continue;
            }

            const cachedRecord = await this.getKnowledgeSourceCacheRecord(source);
            let metadata: KnowledgeSourceMetadata | null = null;

            if (cachedRecord) {
                metadata = await this.fetchKnowledgeSourceMetadata({
                    source,
                    timeoutMs: KNOWLEDGE_SOURCE_HASH_TIMEOUT_MS,
                    agentName,
                });

                if (metadata && this.isKnowledgeSourceCacheValid(cachedRecord, metadata)) {
                    if (this.isVerbose) {
                        console.info('[🤰]', 'Reusing cached knowledge source hash', {
                            agentName,
                            source,
                            sourceHash: cachedRecord.hash,
                        });
                    }

                    contentHashes.push(cachedRecord.hash);
                    continue;
                }
            }

            const hashResult = await this.hashKnowledgeSourceContent({
                source,
                timeoutMs: KNOWLEDGE_SOURCE_HASH_TIMEOUT_MS,
                agentName,
            });

            if (hashResult) {
                contentHashes.push(hashResult.hash);

                await this.upsertKnowledgeSourceCacheRecord({
                    source,
                    hash: hashResult.hash,
                    etag: metadata?.etag ?? hashResult.etag ?? null,
                    lastModified: metadata?.lastModified ?? hashResult.lastModified ?? null,
                    sizeBytes: hashResult.sizeBytes,
                });
            }
        }

        const vectorStoreHash = this.buildVectorStoreHash(contentHashes);

        if (this.isVerbose) {
            console.info('[🤰]', 'Computed vector store hash', {
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
     */
    private async hashKnowledgeSourceContent(options: {
        readonly source: string;
        readonly timeoutMs: number;
        readonly agentName: string;
    }): Promise<KnowledgeSourceHashResult | null> {
        const { source, timeoutMs, agentName } = options;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const startedAtMs = Date.now();

        if (this.isVerbose) {
            console.info('[🤰]', 'Hashing knowledge source content', {
                agentName,
                source,
                timeoutMs,
            });
        }

        try {
            const response = await fetch(source, { signal: controller.signal });

            if (!response.ok) {
                console.error('[🤰]', 'Failed to download knowledge source for hashing', {
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
            const etag = response.headers.get('etag');
            const lastModified = response.headers.get('last-modified');

            if (this.isVerbose) {
                console.info('[🤰]', 'Hashed knowledge source content', {
                    agentName,
                    source,
                    sizeBytes: buffer.byteLength,
                    etag,
                    lastModified,
                    elapsedMs: Date.now() - startedAtMs,
                });
            }

            return {
                hash,
                sizeBytes: buffer.byteLength,
                etag,
                lastModified,
            };
        } catch (error) {
            if (this.isVerbose) {
                console.error('[🤰]', 'Error hashing knowledge source content', {
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
     * Fetches metadata for a knowledge source URL without streaming the full content.
     */
    private async fetchKnowledgeSourceMetadata(options: {
        readonly source: string;
        readonly timeoutMs: number;
        readonly agentName: string;
    }): Promise<KnowledgeSourceMetadata | null> {
        const { source, timeoutMs, agentName } = options;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const startedAtMs = Date.now();

        if (this.isVerbose) {
            console.info('[🤰]', 'Fetching knowledge source metadata', {
                agentName,
                source,
                timeoutMs,
            });
        }

        try {
            const response = await fetch(source, { method: 'HEAD', signal: controller.signal });

            if (!response.ok) {
                if (this.isVerbose) {
                    console.warn('[🤰]', 'Failed to fetch knowledge source metadata', {
                        agentName,
                        source,
                        status: response.status,
                        statusText: response.statusText,
                        elapsedMs: Date.now() - startedAtMs,
                    });
                }

                return null;
            }

            const etag = this.normalizeKnowledgeSourceHeaderValue(response.headers.get('etag'));
            const lastModified = this.normalizeKnowledgeSourceHeaderValue(response.headers.get('last-modified'));
            let sizeBytes: number | null = null;
            const contentLength = response.headers.get('content-length');

            if (contentLength) {
                const parsed = Number.parseInt(contentLength, 10);

                if (!Number.isNaN(parsed)) {
                    sizeBytes = parsed;
                }
            }

            if (this.isVerbose) {
                console.info('[🤰]', 'Fetched knowledge source metadata', {
                    agentName,
                    source,
                    etag,
                    lastModified,
                    sizeBytes,
                    elapsedMs: Date.now() - startedAtMs,
                });
            }

            return {
                etag,
                lastModified,
                sizeBytes,
            };
        } catch (error) {
            if (this.isVerbose) {
                console.error('[🤰]', 'Error fetching knowledge source metadata', {
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
     * Returns true when cached metadata matches the freshly fetched metadata.
     */
    private isKnowledgeSourceCacheValid(
        record: KnowledgeSourceCacheRecord,
        metadata: KnowledgeSourceMetadata,
    ): boolean {
        if (metadata.etag && record.etag && metadata.etag === record.etag) {
            return true;
        }

        if (metadata.lastModified && record.lastModified && metadata.lastModified === record.lastModified) {
            return true;
        }

        return false;
    }

    /**
     * Reads cached knowledge source hashes from the database.
     */
    private async getKnowledgeSourceCacheRecord(source: string): Promise<KnowledgeSourceCacheRecord | null> {
        const supabase = $provideSupabaseForServer();
        const { data, error } = await supabase
            .from(await $getTableName(VECTOR_STORE_SOURCE_HASH_TABLE))
            .select('source, hash, etag, lastModified, sizeBytes')
            .eq('source', source)
            .maybeSingle();

        if (error) {
            if (this.isVerbose) {
                console.error('[🤰]', 'Failed to read cached knowledge source hash', {
                    source,
                    error,
                });
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
     * Stores or updates cached knowledge source metadata.
     */
    private async upsertKnowledgeSourceCacheRecord(record: KnowledgeSourceCacheRecord): Promise<void> {
        const supabase = $provideSupabaseForServer();
        const { error } = await supabase
            .from(await $getTableName(VECTOR_STORE_SOURCE_HASH_TABLE))
            .upsert(
                {
                    source: record.source,
                    hash: record.hash,
                    etag: record.etag,
                    lastModified: record.lastModified,
                    sizeBytes: record.sizeBytes,
                    updatedAt: new Date().toISOString(),
                },
                { onConflict: 'source' },
            );

        if (error) {
            console.error('[🤰]', 'Failed to upsert knowledge source hash', {
                source: record.source,
                error,
            });
        }
    }

    /**
     * Normalizes header values returned by remote metadata requests.
     */
    private normalizeKnowledgeSourceHeaderValue(value: string | null): string | null {
        if (!value) {
            return null;
        }

        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
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
}
