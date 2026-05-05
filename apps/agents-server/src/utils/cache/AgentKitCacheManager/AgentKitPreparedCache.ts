import type { AgentModelRequirements } from '@promptbook-local/types';
import { createHash } from 'crypto';
import type { OpenAiAgentKitExecutionTools } from '../../../../../../src/llm-providers/openai/OpenAiAgentKitExecutionTools';

/**
 * Short-lived in-memory cache lifetime for fully prepared AgentKit agents.
 *
 * @private function of AgentKitCacheManager
 */
const PREPARED_AGENT_KIT_CACHE_TTL_MS = 5 * 60_000;

/**
 * Shared prepared AgentKit agent snapshot stored in memory for repeated chat turns.
 *
 * @private function of AgentKitCacheManager
 */
export type AgentKitPreparedCacheEntry = {
    /**
     * Expiration timestamp for the cached prepared agent.
     */
    readonly expiresAt: number;

    /**
     * Prepared AgentKit agent ready to clone into request-scoped tools.
     */
    readonly preparedAgent: Awaited<ReturnType<OpenAiAgentKitExecutionTools['prepareAgentKitAgent']>>;

    /**
     * Whether the initial preparation reused cached AgentKit or knowledge-base state.
     */
    readonly fromCache: boolean;

    /**
     * Knowledge-source hash used for the prepared agent.
     */
    readonly vectorStoreHash: string | null;
};

/**
 * In-memory prepared AgentKit agents keyed by fully resolved preparation payload.
 *
 * @private function of AgentKitCacheManager
 */
const preparedAgentKitCacheEntries = new Map<string, AgentKitPreparedCacheEntry>();

/**
 * In-flight prepared AgentKit computations keyed by fully resolved preparation payload.
 *
 * @private function of AgentKitCacheManager
 */
const pendingPreparedAgentKitCacheEntries = new Map<string, Promise<AgentKitPreparedCacheEntry>>();

/**
 * Shared short-lived cache for prepared AgentKit agents.
 *
 * @private function of AgentKitCacheManager
 */
export class AgentKitPreparedCache {
    /**
     * Builds one cache key for the fully resolved AgentKit preparation payload.
     */
    public createCacheKey(assistantCacheKey: string, modelRequirements: AgentModelRequirements): string {
        const payload = JSON.stringify({
            assistantCacheKey,
            systemMessage: modelRequirements.systemMessage,
            promptSuffix: modelRequirements.promptSuffix,
            knowledgeSources: modelRequirements.knowledgeSources ?? [],
            tools: modelRequirements.tools ?? [],
            mcpServers: modelRequirements.mcpServers ?? [],
            importedAgentUrls: modelRequirements.importedAgentUrls ?? [],
            importedFileUrls: modelRequirements.importedFileUrls ?? [],
            parentAgentUrl: modelRequirements.parentAgentUrl,
            isClosed: modelRequirements.isClosed,
        });

        return createHash('sha256').update(payload).digest('hex');
    }

    /**
     * Gets or creates one prepared AgentKit cache entry with shared in-flight deduplication.
     */
    public async getOrCreate(options: {
        readonly cacheKey: string;
        readonly createEntry: () => Promise<Omit<AgentKitPreparedCacheEntry, 'expiresAt'>>;
        readonly onCacheHit?: (cacheEntry: AgentKitPreparedCacheEntry) => void;
    }): Promise<AgentKitPreparedCacheEntry> {
        const cachedEntry = this.readCacheEntry(options.cacheKey);

        if (cachedEntry) {
            options.onCacheHit?.(cachedEntry);

            return {
                ...cachedEntry,
                fromCache: true,
            };
        }

        const pendingEntry = pendingPreparedAgentKitCacheEntries.get(options.cacheKey);
        if (pendingEntry) {
            return pendingEntry;
        }

        const pendingComputation = (async (): Promise<AgentKitPreparedCacheEntry> => {
            try {
                const createdEntry = await options.createEntry();
                return this.writeCacheEntry(options.cacheKey, createdEntry);
            } finally {
                pendingPreparedAgentKitCacheEntries.delete(options.cacheKey);
            }
        })();

        pendingPreparedAgentKitCacheEntries.set(options.cacheKey, pendingComputation);
        return pendingComputation;
    }

    /**
     * Reads a prepared AgentKit cache entry when it is still fresh.
     */
    private readCacheEntry(cacheKey: string): AgentKitPreparedCacheEntry | null {
        const cachedEntry = preparedAgentKitCacheEntries.get(cacheKey);

        if (!cachedEntry) {
            return null;
        }

        if (cachedEntry.expiresAt <= Date.now()) {
            preparedAgentKitCacheEntries.delete(cacheKey);
            return null;
        }

        return cachedEntry;
    }

    /**
     * Stores one prepared AgentKit cache entry and drops expired siblings.
     */
    private writeCacheEntry(
        cacheKey: string,
        cacheEntry: Omit<AgentKitPreparedCacheEntry, 'expiresAt'>,
    ): AgentKitPreparedCacheEntry {
        const now = Date.now();

        for (const [existingKey, existingEntry] of preparedAgentKitCacheEntries.entries()) {
            if (existingEntry.expiresAt <= now) {
                preparedAgentKitCacheEntries.delete(existingKey);
            }
        }

        const nextEntry: AgentKitPreparedCacheEntry = {
            expiresAt: now + PREPARED_AGENT_KIT_CACHE_TTL_MS,
            ...cacheEntry,
        };

        preparedAgentKitCacheEntries.set(cacheKey, nextEntry);
        return nextEntry;
    }
}
