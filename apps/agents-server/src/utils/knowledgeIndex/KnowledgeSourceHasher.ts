import { createHash } from 'crypto';
import { parseDataUrlKnowledgeSource } from '../../../../../src/utils/knowledge/inlineKnowledgeSource';
import { KnowledgeIndexCacheRepository } from './KnowledgeIndexCacheRepository';
import { LLAMA_INDEX_EMBEDDING_MODEL_NAME } from './OpenAiLlamaIndexEmbedding';

/**
 * Timeout used when hashing remote knowledge sources.
 */
const KNOWLEDGE_SOURCE_HASH_TIMEOUT_MS = 30_000;

/**
 * Hash version used to invalidate old index payloads when indexing behavior changes.
 */
export const KNOWLEDGE_INDEX_HASH_VERSION = 'llama-index-v1';

/**
 * Per-source hash result used to build one index hash.
 */
type KnowledgeSourceContentHash = {
    readonly source: string;
    readonly hash: string;
};

/**
 * Result of computing one index hash.
 */
export type KnowledgeIndexHashResult = {
    readonly hash: string;
    readonly sourceHashes: ReadonlyArray<KnowledgeSourceContentHash>;
};

/**
 * Metadata returned by remote `HEAD` requests.
 */
type KnowledgeSourceMetadata = {
    readonly etag: string | null;
    readonly lastModified: string | null;
    readonly sizeBytes: number | null;
};

/**
 * Result of downloading and hashing one remote source.
 */
type KnowledgeSourceDownloadHash = KnowledgeSourceMetadata & {
    readonly hash: string;
};

/**
 * Computes stable content hashes for knowledge indexes.
 */
export class KnowledgeSourceHasher {
    private readonly repository: KnowledgeIndexCacheRepository;
    private readonly isVerbose: boolean;

    /**
     * Creates a source hasher.
     */
    public constructor(options: {
        readonly tablePrefix?: string;
        readonly isVerbose?: boolean;
        readonly repository?: KnowledgeIndexCacheRepository;
    } = {}) {
        this.repository =
            options.repository ||
            new KnowledgeIndexCacheRepository({
                tablePrefix: options.tablePrefix,
                isVerbose: options.isVerbose,
            });
        this.isVerbose = options.isVerbose ?? false;
    }

    /**
     * Computes one deterministic hash for a knowledge source collection.
     */
    public async computeKnowledgeIndexHash(options: {
        readonly agentName: string;
        readonly knowledgeSources: ReadonlyArray<string>;
    }): Promise<KnowledgeIndexHashResult | null> {
        if (options.knowledgeSources.length === 0) {
            return null;
        }

        const sourceHashes: KnowledgeSourceContentHash[] = [];

        for (const source of options.knowledgeSources) {
            sourceHashes.push({
                source,
                hash: await this.computeKnowledgeSourceHash(source, options.agentName),
            });
        }

        const hash = this.buildKnowledgeIndexHash(sourceHashes);

        if (this.isVerbose) {
            console.info('[knowledge-index] computed index hash', {
                agentName: options.agentName,
                hash,
                sourceCount: sourceHashes.length,
            });
        }

        return {
            hash,
            sourceHashes,
        };
    }

    /**
     * Computes a content hash for one source.
     */
    private async computeKnowledgeSourceHash(source: string, agentName: string): Promise<string> {
        const dataUrlSource = parseDataUrlKnowledgeSource(source);

        if (dataUrlSource) {
            return createSha256Hash(dataUrlSource.buffer);
        }

        if (!isHttpSource(source)) {
            return createSha256Hash(source);
        }

        const cachedRecord = await this.repository.getKnowledgeSourceHash(source);
        const metadata = cachedRecord
            ? await this.fetchKnowledgeSourceMetadata({
                  source,
                  agentName,
              })
            : null;

        if (cachedRecord && metadata && isKnowledgeSourceHashCacheValid(cachedRecord, metadata)) {
            return cachedRecord.hash;
        }

        const downloadHash = await this.hashRemoteKnowledgeSource({
            source,
            agentName,
        });

        if (!downloadHash) {
            return createSha256Hash(`unavailable:${source}`);
        }

        await this.repository.upsertKnowledgeSourceHash({
            source,
            hash: downloadHash.hash,
            etag: metadata?.etag ?? downloadHash.etag,
            lastModified: metadata?.lastModified ?? downloadHash.lastModified,
            sizeBytes: downloadHash.sizeBytes,
        });

        return downloadHash.hash;
    }

    /**
     * Downloads and hashes one remote knowledge source.
     */
    private async hashRemoteKnowledgeSource(options: {
        readonly source: string;
        readonly agentName: string;
    }): Promise<KnowledgeSourceDownloadHash | null> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), KNOWLEDGE_SOURCE_HASH_TIMEOUT_MS);

        try {
            const response = await fetch(options.source, { signal: controller.signal });

            if (!response.ok) {
                if (this.isVerbose) {
                    console.warn('[knowledge-index] failed to download source for hashing', {
                        agentName: options.agentName,
                        source: options.source,
                        status: response.status,
                    });
                }

                return null;
            }

            const buffer = Buffer.from(await response.arrayBuffer());

            return {
                hash: createSha256Hash(buffer),
                etag: normalizeHeaderValue(response.headers.get('etag')),
                lastModified: normalizeHeaderValue(response.headers.get('last-modified')),
                sizeBytes: buffer.byteLength,
            };
        } catch (error) {
            if (this.isVerbose) {
                console.warn('[knowledge-index] source hashing failed', {
                    agentName: options.agentName,
                    source: options.source,
                    error,
                });
            }

            return null;
        } finally {
            clearTimeout(timeout);
        }
    }

    /**
     * Fetches remote metadata without downloading the full source body.
     */
    private async fetchKnowledgeSourceMetadata(options: {
        readonly source: string;
        readonly agentName: string;
    }): Promise<KnowledgeSourceMetadata | null> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), KNOWLEDGE_SOURCE_HASH_TIMEOUT_MS);

        try {
            const response = await fetch(options.source, {
                method: 'HEAD',
                signal: controller.signal,
            });

            if (!response.ok) {
                return null;
            }

            return {
                etag: normalizeHeaderValue(response.headers.get('etag')),
                lastModified: normalizeHeaderValue(response.headers.get('last-modified')),
                sizeBytes: normalizeContentLength(response.headers.get('content-length')),
            };
        } catch (error) {
            if (this.isVerbose) {
                console.warn('[knowledge-index] source metadata lookup failed', {
                    agentName: options.agentName,
                    source: options.source,
                    error,
                });
            }

            return null;
        } finally {
            clearTimeout(timeout);
        }
    }

    /**
     * Builds the collection-level index hash.
     */
    private buildKnowledgeIndexHash(sourceHashes: ReadonlyArray<KnowledgeSourceContentHash>): string {
        return createSha256Hash(
            JSON.stringify({
                version: KNOWLEDGE_INDEX_HASH_VERSION,
                embeddingModel: LLAMA_INDEX_EMBEDDING_MODEL_NAME,
                sourceHashes: [...sourceHashes].sort((left, right) => left.source.localeCompare(right.source)),
            }),
        );
    }
}

/**
 * Returns true when one source is an HTTP(S) URL.
 */
function isHttpSource(source: string): boolean {
    return source.startsWith('http://') || source.startsWith('https://');
}

/**
 * Checks whether cached source metadata still matches the remote source.
 */
function isKnowledgeSourceHashCacheValid(
    record: { readonly etag: string | null; readonly lastModified: string | null },
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
 * Normalizes one response header into a cacheable string.
 */
function normalizeHeaderValue(value: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed || null;
}

/**
 * Normalizes `Content-Length` into a number.
 */
function normalizeContentLength(value: string | null): number | null {
    if (!value) {
        return null;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * Creates a hex SHA-256 digest from a string or buffer.
 */
function createSha256Hash(value: string | Buffer): string {
    return createHash('sha256').update(value).digest('hex');
}
