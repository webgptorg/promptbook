import { createAgentModelRequirements, computeAgentHash } from '@promptbook-local/core';
import type { AgentModelRequirements } from '@promptbook-local/types';
import type { AgentReferenceResolver } from '../../../../src/book-2.0/agent-source/AgentReferenceResolver';
import type { AgentReferenceResolutionIssue } from './agentReferenceResolver/AgentReferenceResolutionIssue';
import { consumeAgentReferenceResolutionIssues } from './agentReferenceResolver/AgentReferenceResolutionIssue';
import { createBookScopedAgentReferenceResolver } from './agentReferenceResolver/bookScopedAgentReferences';
import { createInlineKnowledgeSourceUploader } from './knowledge/createInlineKnowledgeSourceUploader';
import {
    resolveServerAgentContext,
    type ResolvedServerAgentContext,
    type ResolveServerAgentContextOptions,
} from './resolveServerAgentContext';

/**
 * Shared cache lifetime for resolved agent runtime snapshots.
 */
const SERVER_AGENT_CONTEXT_CACHE_TTL_MS = 5 * 60_000;

/**
 * Shared cache lifetime for prepared agent model requirements.
 */
const SERVER_AGENT_MODEL_REQUIREMENTS_CACHE_TTL_MS = 5 * 60_000;

/**
 * Immutable resolved server-agent context safe to reuse across requests.
 */
export type CachedServerAgentContext = Omit<ResolvedServerAgentContext, 'scopedAgentReferenceResolver'>;

/**
 * Result of preparing cached model requirements for one resolved server agent.
 */
export type CachedServerAgentModelRequirements = {
    /**
     * Prepared model requirements derived from the resolved source.
     */
    readonly modelRequirements: AgentModelRequirements;

    /**
     * Unresolved agent references captured while preparing the requirements.
     */
    readonly unresolvedAgentReferences: ReadonlyArray<AgentReferenceResolutionIssue>;
};

/**
 * One expiring cache entry reused across requests.
 */
type ExpiringCacheEntry<TValue> = {
    readonly expiresAt: number;
    readonly value: TValue;
};

/**
 * Options required to resolve one cached server-agent context snapshot.
 */
export type ResolveCachedServerAgentContextOptions = ResolveServerAgentContextOptions;

/**
 * Options required to resolve cached model requirements for one server agent.
 */
export type ResolveCachedServerAgentModelRequirementsOptions = {
    /**
     * Previously resolved immutable agent context snapshot.
     */
    readonly resolvedAgentContext: CachedServerAgentContext;

    /**
     * Local/public server origin used when rebuilding the scoped resolver.
     */
    readonly localServerUrl: string;

    /**
     * Optional fallback resolver for compact local/federated references.
     */
    readonly fallbackResolver?: AgentReferenceResolver;
};

/**
 * Cached resolved runtime snapshots keyed by `(origin, agentIdentifier)`.
 */
const serverAgentContextCache = new Map<string, ExpiringCacheEntry<CachedServerAgentContext>>();

/**
 * In-flight resolved runtime computations keyed by `(origin, agentIdentifier)`.
 */
const pendingServerAgentContexts = new Map<string, Promise<CachedServerAgentContext>>();

/**
 * Cached prepared model requirements keyed by resolved context fingerprint.
 */
const serverAgentModelRequirementsCache = new Map<string, ExpiringCacheEntry<CachedServerAgentModelRequirements>>();

/**
 * In-flight model-requirements computations keyed by resolved context fingerprint.
 */
const pendingServerAgentModelRequirements = new Map<string, Promise<CachedServerAgentModelRequirements>>();

/**
 * Clears all cached server-agent runtime data after agent/source updates.
 */
export function invalidateCachedServerAgentRuntime(): void {
    serverAgentContextCache.clear();
    pendingServerAgentContexts.clear();
    serverAgentModelRequirementsCache.clear();
    pendingServerAgentModelRequirements.clear();
}

/**
 * Resolves one immutable server-agent context snapshot and reuses it for a short time.
 *
 * The cached snapshot deliberately excludes the scoped resolver because that resolver tracks
 * unresolved-reference diagnostics internally and is therefore not safe to share across requests.
 */
export async function resolveCachedServerAgentContext(
    options: ResolveCachedServerAgentContextOptions,
): Promise<CachedServerAgentContext> {
    const cacheKey = createServerAgentContextCacheKey(options);
    const cachedEntry = readValidCacheEntry(serverAgentContextCache, cacheKey);

    if (cachedEntry) {
        return cachedEntry;
    }

    const pendingComputation = pendingServerAgentContexts.get(cacheKey);
    if (pendingComputation) {
        return pendingComputation;
    }

    const computation = (async (): Promise<CachedServerAgentContext> => {
        try {
            const resolvedAgentContext = await resolveServerAgentContext(options);
            const { scopedAgentReferenceResolver, ...cachedContext } = resolvedAgentContext;

            keepUnusedResolver(scopedAgentReferenceResolver);
            writeCacheEntry(
                serverAgentContextCache,
                cacheKey,
                cachedContext,
                SERVER_AGENT_CONTEXT_CACHE_TTL_MS,
            );

            return cachedContext;
        } finally {
            pendingServerAgentContexts.delete(cacheKey);
        }
    })();

    pendingServerAgentContexts.set(cacheKey, computation);
    return computation;
}

/**
 * Resolves prepared model requirements for one cached server-agent context.
 *
 * This rebuilds a fresh scoped resolver on cache misses so unresolved-reference tracking stays
 * request-safe while the expensive resolved-source + commitment preparation work stays shared.
 */
export async function resolveCachedServerAgentModelRequirements(
    options: ResolveCachedServerAgentModelRequirementsOptions,
): Promise<CachedServerAgentModelRequirements> {
    const cacheKey = createServerAgentModelRequirementsCacheKey(options);
    const cachedEntry = readValidCacheEntry(serverAgentModelRequirementsCache, cacheKey);

    if (cachedEntry) {
        return cachedEntry;
    }

    const pendingComputation = pendingServerAgentModelRequirements.get(cacheKey);
    if (pendingComputation) {
        return pendingComputation;
    }

    const computation = (async (): Promise<CachedServerAgentModelRequirements> => {
        try {
            const scopedAgentReferenceResolver = createBookScopedAgentReferenceResolver({
                parentAgentSource: options.resolvedAgentContext.parentAgentSource,
                parentAgentIdentifier: options.resolvedAgentContext.parentAgentPermanentId,
                localServerUrl: options.localServerUrl,
                fallbackResolver: options.fallbackResolver,
            });
            const modelRequirements = await createAgentModelRequirements(
                options.resolvedAgentContext.resolvedAgentSource,
                undefined,
                undefined,
                undefined,
                {
                    agentReferenceResolver: scopedAgentReferenceResolver,
                    inlineKnowledgeSourceUploader: createInlineKnowledgeSourceUploader(),
                },
            );
            const unresolvedAgentReferences = consumeAgentReferenceResolutionIssues(scopedAgentReferenceResolver);
            const preparedRequirements = {
                modelRequirements,
                unresolvedAgentReferences,
            } satisfies CachedServerAgentModelRequirements;

            writeCacheEntry(
                serverAgentModelRequirementsCache,
                cacheKey,
                preparedRequirements,
                SERVER_AGENT_MODEL_REQUIREMENTS_CACHE_TTL_MS,
            );

            return preparedRequirements;
        } finally {
            pendingServerAgentModelRequirements.delete(cacheKey);
        }
    })();

    pendingServerAgentModelRequirements.set(cacheKey, computation);
    return computation;
}

/**
 * Creates a stable cache key for one resolved server-agent context request.
 */
function createServerAgentContextCacheKey(options: ResolveCachedServerAgentContextOptions): string {
    return JSON.stringify({
        localServerUrl: normalizeServerOrigin(options.localServerUrl),
        agentIdentifier: options.agentIdentifier,
    });
}

/**
 * Creates a stable cache key for one prepared model-requirements payload.
 */
function createServerAgentModelRequirementsCacheKey(
    options: ResolveCachedServerAgentModelRequirementsOptions,
): string {
    return JSON.stringify({
        localServerUrl: normalizeServerOrigin(options.localServerUrl),
        canonicalAgentIdentifier: options.resolvedAgentContext.canonicalAgentIdentifier,
        parentAgentPermanentId: options.resolvedAgentContext.parentAgentPermanentId,
        resolvedAgentSourceHash: computeAgentHash(options.resolvedAgentContext.resolvedAgentSource),
    });
}

/**
 * Normalizes origins used in runtime cache keys.
 */
function normalizeServerOrigin(localServerUrl: string): string {
    return localServerUrl.replace(/\/+$/g, '');
}

/**
 * Reads one cache entry only when it is still fresh.
 */
function readValidCacheEntry<TValue>(
    cache: Map<string, ExpiringCacheEntry<TValue>>,
    cacheKey: string,
): TValue | null {
    const cachedEntry = cache.get(cacheKey);

    if (!cachedEntry) {
        return null;
    }

    if (cachedEntry.expiresAt <= Date.now()) {
        cache.delete(cacheKey);
        return null;
    }

    return cachedEntry.value;
}

/**
 * Stores one expiring cache entry and opportunistically removes stale siblings.
 */
function writeCacheEntry<TValue>(
    cache: Map<string, ExpiringCacheEntry<TValue>>,
    cacheKey: string,
    value: TValue,
    ttlMs: number,
): void {
    const now = Date.now();

    for (const [existingKey, existingEntry] of cache.entries()) {
        if (existingEntry.expiresAt <= now) {
            cache.delete(existingKey);
        }
    }

    cache.set(cacheKey, {
        value,
        expiresAt: now + ttlMs,
    });
}

/**
 * Keeps the stripped resolver explicitly unused after snapshot extraction.
 */
function keepUnusedResolver(agentReferenceResolver: AgentReferenceResolver): void {
    void agentReferenceResolver;
}
