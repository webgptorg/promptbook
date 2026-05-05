import type { AgentKitLlamaIndexKnowledgeBase } from './AgentKitLlamaIndexKnowledgeBase';

/**
 * Short-lived in-memory cache lifetime for LlamaIndex knowledge bases.
 *
 * @private function of AgentKitCacheManager
 */
const LLAMA_INDEX_KNOWLEDGE_CACHE_TTL_MS = 30 * 60_000;

/**
 * One cached LlamaIndex knowledge base entry.
 *
 * @private function of AgentKitCacheManager
 */
type AgentKitLlamaIndexKnowledgeCacheEntry = {
    readonly expiresAt: number;
    readonly knowledgeBase: AgentKitLlamaIndexKnowledgeBase;
};

/**
 * Result of resolving one LlamaIndex knowledge base from cache.
 *
 * @private function of AgentKitCacheManager
 */
export type AgentKitLlamaIndexKnowledgeCacheResult = {
    readonly knowledgeBase: AgentKitLlamaIndexKnowledgeBase;
    readonly fromCache: boolean;
};

/**
 * Shared LlamaIndex knowledge bases keyed by stable knowledge-source content hash.
 *
 * @private function of AgentKitCacheManager
 */
const llamaIndexKnowledgeCacheEntries = new Map<string, AgentKitLlamaIndexKnowledgeCacheEntry>();

/**
 * In-flight LlamaIndex knowledge-base computations keyed by stable knowledge-source content hash.
 *
 * @private function of AgentKitCacheManager
 */
const pendingLlamaIndexKnowledgeCacheEntries = new Map<
    string,
    Promise<AgentKitLlamaIndexKnowledgeCacheResult>
>();

/**
 * Short-lived cache for prepared LlamaIndex knowledge bases.
 *
 * @private function of AgentKitCacheManager
 */
export class AgentKitLlamaIndexKnowledgeCache {
    /**
     * Gets or creates one LlamaIndex knowledge base with shared in-flight deduplication.
     */
    public async getOrCreate(options: {
        readonly knowledgeBaseHash: string;
        readonly createKnowledgeBase: () => Promise<AgentKitLlamaIndexKnowledgeBase>;
        readonly onCacheHit?: (cacheEntry: AgentKitLlamaIndexKnowledgeCacheEntry) => void;
    }): Promise<AgentKitLlamaIndexKnowledgeCacheResult> {
        const cachedEntry = this.readCacheEntry(options.knowledgeBaseHash);

        if (cachedEntry) {
            options.onCacheHit?.(cachedEntry);

            return {
                knowledgeBase: cachedEntry.knowledgeBase,
                fromCache: true,
            };
        }

        const pendingEntry = pendingLlamaIndexKnowledgeCacheEntries.get(options.knowledgeBaseHash);

        if (pendingEntry) {
            return pendingEntry;
        }

        const pendingComputation = (async (): Promise<AgentKitLlamaIndexKnowledgeCacheResult> => {
            try {
                const knowledgeBase = await options.createKnowledgeBase();
                const cacheEntry = this.writeCacheEntry(options.knowledgeBaseHash, knowledgeBase);

                return {
                    knowledgeBase: cacheEntry.knowledgeBase,
                    fromCache: false,
                };
            } finally {
                pendingLlamaIndexKnowledgeCacheEntries.delete(options.knowledgeBaseHash);
            }
        })();

        pendingLlamaIndexKnowledgeCacheEntries.set(options.knowledgeBaseHash, pendingComputation);
        return pendingComputation;
    }

    /**
     * Invalidates cache for a specific knowledge-base hash.
     */
    public invalidateCache(knowledgeBaseHash: string): void {
        llamaIndexKnowledgeCacheEntries.delete(knowledgeBaseHash);
        pendingLlamaIndexKnowledgeCacheEntries.delete(knowledgeBaseHash);
    }

    /**
     * Reads a cached LlamaIndex knowledge base when it is still fresh.
     */
    private readCacheEntry(knowledgeBaseHash: string): AgentKitLlamaIndexKnowledgeCacheEntry | null {
        const cachedEntry = llamaIndexKnowledgeCacheEntries.get(knowledgeBaseHash);

        if (!cachedEntry) {
            return null;
        }

        if (cachedEntry.expiresAt <= Date.now()) {
            llamaIndexKnowledgeCacheEntries.delete(knowledgeBaseHash);
            return null;
        }

        return cachedEntry;
    }

    /**
     * Stores one LlamaIndex knowledge base and drops expired siblings.
     */
    private writeCacheEntry(
        knowledgeBaseHash: string,
        knowledgeBase: AgentKitLlamaIndexKnowledgeBase,
    ): AgentKitLlamaIndexKnowledgeCacheEntry {
        const now = Date.now();

        for (const [existingHash, existingEntry] of llamaIndexKnowledgeCacheEntries.entries()) {
            if (existingEntry.expiresAt <= now) {
                llamaIndexKnowledgeCacheEntries.delete(existingHash);
            }
        }

        const nextEntry: AgentKitLlamaIndexKnowledgeCacheEntry = {
            expiresAt: now + LLAMA_INDEX_KNOWLEDGE_CACHE_TTL_MS,
            knowledgeBase,
        };

        llamaIndexKnowledgeCacheEntries.set(knowledgeBaseHash, nextEntry);
        return nextEntry;
    }
}
