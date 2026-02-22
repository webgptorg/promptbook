import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { createAgentModelRequirements } from '@promptbook-local/core';
import { AgentModelRequirements, string_agent_permanent_id, string_book, TODO_any } from '@promptbook-local/types';
import { createHash } from 'crypto';
import { spaceTrim } from 'spacetrim';
import { OpenAiAgentKitExecutionTools } from '../../../../../src/llm-providers/openai/OpenAiAgentKitExecutionTools';
import {
    AssistantConfiguration,
    computeAssistantCacheKey,
    extractAssistantConfiguration,
    formatAssistantNameWithHash,
} from './computeAssistantCacheKey';
import { $provideAgentReferenceResolver } from '../agentReferenceResolver/$provideAgentReferenceResolver';
import { consumeAgentReferenceResolutionIssues } from '../agentReferenceResolver/AgentReferenceResolutionIssue';
import { createInlineKnowledgeSourceUploader } from '@/src/utils/knowledge/createInlineKnowledgeSourceUploader';
import { resolveWebsiteKnowledgeSourcesForServer } from '@/src/utils/knowledge/resolveWebsiteKnowledgeSourcesForServer';
import type { AgentReferenceResolver } from '../../../../../src/book-2.0/agent-source/AgentReferenceResolver';

const KNOWLEDGE_SOURCE_HASH_TIMEOUT_MS = 30000;
const VECTOR_STORE_HASH_VERSION = 'vector-store-v1';

/**
 * Marker used to avoid appending the same citation policy block multiple times.
 */
const SOURCE_CITATION_POLICY_SENTINEL = 'Source citation policy:';

/**
 * Tool names where source-backed responses should include citations.
 */
const SOURCE_CITATION_TOOL_NAMES = new Set(['web_search', 'fetch_url_content', 'run_browser']);

/**
 * Minimal shape needed to inspect tool names for citation policy decisions.
 */
type CitationAwareToolDefinition = {
    readonly name: string;
};

/**
 * Returns true when the tool list includes tools that usually produce source-backed answers.
 *
 * @param tools - Tool definitions configured for the agent.
 * @returns True when citations should be explicitly enforced.
 */
function hasSourceCitationSensitiveTools(tools: ReadonlyArray<CitationAwareToolDefinition> | undefined): boolean {
    if (!tools || tools.length === 0) {
        return false;
    }

    return tools.some((tool) => SOURCE_CITATION_TOOL_NAMES.has(tool.name));
}

/**
 * Appends an explicit source citation policy for agents that rely on knowledge sources or web tools.
 *
 * @param baseInstructions - Original system instructions produced from agent commitments.
 * @param options - Inputs used to decide whether citation policy should be enforced.
 * @returns Instructions with citation policy appended once when applicable.
 */
function withSourceCitationPolicy(
    baseInstructions: string,
    options: {
        readonly knowledgeSources: ReadonlyArray<string>;
        readonly tools: ReadonlyArray<CitationAwareToolDefinition> | undefined;
    },
): string {
    const { knowledgeSources, tools } = options;
    const shouldEnforceSourceCitations =
        knowledgeSources.length > 0 || hasSourceCitationSensitiveTools(tools);

    if (!shouldEnforceSourceCitations) {
        return baseInstructions;
    }

    if (baseInstructions.includes(SOURCE_CITATION_POLICY_SENTINEL)) {
        return baseInstructions;
    }

    const citationPolicy = spaceTrim(
        `
            ${SOURCE_CITATION_POLICY_SENTINEL}
            - When an answer relies on knowledge sources or web/browser tool results, include source citations.
            - Use OpenAI citation markers in the answer body (for example: 【4:0†source】).
            - Do not present source-backed factual claims without citations.
            - If no external source was used, state that clearly instead of inventing citations.
        `,
    );

    return baseInstructions ? `${baseInstructions}\n\n${citationPolicy}` : citationPolicy;
}

/**
 * Supported external types stored in AgentExternals.
 */
type AgentExternalType = 'VECTOR_STORE';

const VECTOR_STORE_EXTERNAL_TYPE: AgentExternalType = 'VECTOR_STORE';

const VECTOR_STORE_SOURCE_HASH_TABLE = 'VectorStoreKnowledgeSourceHashes';

/**
 * Metadata returned by HEAD requests made against knowledge source URLs.
 */
type KnowledgeSourceMetadata = {
    readonly etag?: string | null;
    readonly lastModified?: string | null;
    readonly sizeBytes?: number | null;
};

/**
 * Cached information about a previously hashed knowledge source file.
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
 */
type KnowledgeSourceHashResult = {
    readonly hash: string;
    readonly sizeBytes: number;
    readonly etag: string | null;
    readonly lastModified: string | null;
};

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

            /**
             * Optional resolver for compact agent references scoped to the current book.
             */
            agentReferenceResolver?: AgentReferenceResolver;
        } = {},
    ): Promise<AgentKitCacheResult> {
        const { includeDynamicContext = true, agentId, onCacheMiss, agentReferenceResolver } = options;

        const configuration = extractAssistantConfiguration(agentSource, { includeDynamicContext });
        const assistantCacheKey = computeAssistantCacheKey(configuration);

        if (this.isVerbose) {
            console.info('[🤰]', 'Resolving AgentKit cache key', {
                agentName,
                assistantCacheKey,
                includeDynamicContext,
                instructionsLength: configuration.instructions.length,
                baseSourceLength: configuration.baseAgentSource.length,
                agentId,
            });
        }

        const effectiveAgentReferenceResolver = agentReferenceResolver || (await $provideAgentReferenceResolver());
        const modelRequirements: AgentModelRequirements = await createAgentModelRequirements(
            configuration.baseAgentSource,
            undefined,
            undefined,
            undefined,
            {
                agentReferenceResolver: effectiveAgentReferenceResolver,
                inlineKnowledgeSourceUploader: createInlineKnowledgeSourceUploader(),
            },
        );
        const unresolvedAgentReferences = consumeAgentReferenceResolutionIssues(effectiveAgentReferenceResolver);
        if (unresolvedAgentReferences.length > 0) {
            console.warn('[AgentKitCacheManager] Unresolved agent references detected:', unresolvedAgentReferences);
        }
        const knowledgeSources = modelRequirements.knowledgeSources ? [...modelRequirements.knowledgeSources] : [];
        const tools = modelRequirements.tools ? [...modelRequirements.tools] : undefined;
        const instructions = withSourceCitationPolicy(modelRequirements.systemMessage, { knowledgeSources, tools });
        const agentKitName = formatAssistantNameWithHash(configuration.name || agentName, assistantCacheKey);

        const vectorStoreHash = await this.computeVectorStoreHash({ agentName, knowledgeSources });
        const cachedVectorStoreId = vectorStoreHash
            ? await this.getCachedVectorStoreId(vectorStoreHash, baseTools)
            : null;

        if (cachedVectorStoreId && this.isVerbose) {
            console.info('[🤰]', 'AgentKit cache hit (vector store)', {
                agentName,
                assistantCacheKey,
                vectorStoreHash,
                vectorStoreId: cachedVectorStoreId,
            });
        }

        if (!cachedVectorStoreId && knowledgeSources.length > 0 && onCacheMiss) {
            await onCacheMiss();
        }

        const preparedKnowledgeSources =
            !cachedVectorStoreId && knowledgeSources.length > 0
                ? await resolveWebsiteKnowledgeSourcesForServer(knowledgeSources, { isVerbose: this.isVerbose })
                : knowledgeSources;

        if (this.isVerbose) {
            console.info('[🤰]', 'Preparing AgentKit agent via cache manager', {
                agentName,
                agentKitName,
                instructionsLength: instructions.length,
                knowledgeSourcesCount: preparedKnowledgeSources.length,
                toolsCount: tools?.length ?? 0,
            });
        }

        const preparedAgent = await baseTools.prepareAgentKitAgent({
            name: agentKitName,
            instructions,
            knowledgeSources: preparedKnowledgeSources,
            tools,
            vectorStoreId: cachedVectorStoreId ?? undefined,
        });

        if (!cachedVectorStoreId && preparedAgent.vectorStoreId && vectorStoreHash) {
            const note = this.buildVectorStoreNote({ agentName, knowledgeSources });
            await this.cacheVectorStore(vectorStoreHash, preparedAgent.vectorStoreId, note);
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

    /**
     * Builds a human-friendly note for a cached vector store.
     *
     * @param options - Note details.
     * @param options.agentName - Agent name that created the vector store.
     * @param options.knowledgeSources - Knowledge sources stored in the vector store.
     * @returns Note text to store alongside the cached vector store.
     */
    private buildVectorStoreNote(options: {
        readonly agentName: string;
        readonly knowledgeSources: ReadonlyArray<string>;
    }): string {
        const { agentName, knowledgeSources } = options;
        const lines = [`Agent: ${agentName}`, 'Files:'];

        for (const source of knowledgeSources) {
            lines.push(`- ${this.formatKnowledgeSourceLabel(source)}`);
        }

        return lines.join('\n');
    }

    /**
     * Formats a knowledge source label for vector store notes.
     *
     * @param source - Knowledge source identifier.
     * @returns The formatted label to include in the note.
     */
    private formatKnowledgeSourceLabel(source: string): string {
        const fileName = this.getKnowledgeSourceFileName(source);

        if (!fileName || fileName === source) {
            return source;
        }

        return `${fileName} (${source})`;
    }

    /**
     * Extracts a file name from a knowledge source URL when possible.
     *
     * @param source - Knowledge source identifier.
     * @returns The file name or null if it cannot be derived.
     */
    private getKnowledgeSourceFileName(source: string): string | null {
        try {
            const url = new URL(source);
            const segments = url.pathname.split('/').filter(Boolean);
            return segments.length > 0 ? segments[segments.length - 1] : null;
        } catch {
            return null;
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
     *
     * @param vectorStoreHash - Hash for the cached vector store.
     * @param vectorStoreId - External vector store identifier.
     * @param note - Human-friendly note for the cached vector store.
     */
    private async cacheVectorStore(vectorStoreHash: string, vectorStoreId: string, note: string): Promise<void> {
        const supabase = $provideSupabaseForServer();
        const { error: insertError } = await supabase.from(await $getTableName('AgentExternals')).insert({
            type: VECTOR_STORE_EXTERNAL_TYPE,
            hash: vectorStoreHash,
            externalId: vectorStoreId,
            vendor: 'openai',
            note,
        });

        if (insertError && insertError.code !== '23505') {
            console.error('[🤰]', 'AgentKit cache update failed', {
                vectorStoreHash,
                vectorStoreId,
                error: insertError,
            });
        } else if (this.isVerbose) {
            console.info('[🤰]', 'AgentKit vector store cached', {
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
            console.error('[🤰]', 'AgentKit cache invalidation failed', {
                vectorStoreHash,
                error: deleteError,
            });
        } else if (this.isVerbose) {
            console.info('[🤰]', 'AgentKit cache invalidated', { vectorStoreHash });
        }
    }
}
