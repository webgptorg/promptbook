import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideServer } from '@/src/tools/$provideServer';
import { AgentReferenceResolver } from '../../../../../src/book-2.0/agent-source/AgentReferenceResolver';
import { getFederatedServers } from '../getFederatedServers';
import { createServerAgentReferenceResolver } from './createServerAgentReferenceResolver';

/**
 * Lifetime for resolver cache entries.
 */
const CACHE_TTL_MS = 5000;

/**
 * Last successfully constructed resolver instance.
 */
let cachedResolver: AgentReferenceResolver | null = null;

/**
 * Expiration timestamp for `cachedResolver`.
 */
let cacheExpiresAt = 0;

/**
 * Resolver initialization currently running for `pendingResolverGeneration`.
 */
let pendingResolver: Promise<AgentReferenceResolver> | null = null;

/**
 * Cache generation associated with `pendingResolver`.
 */
let pendingResolverGeneration = 0;

/**
 * Monotonic cache generation incremented on each invalidation.
 */
let resolverCacheGeneration = 0;

/**
 * Invalidates the cached resolver so the next request rebuilds from current agent state.
 */
export function $invalidateProvidedAgentReferenceResolverCache(): void {
    resolverCacheGeneration++;
    cachedResolver = null;
    cacheExpiresAt = 0;
}

/**
 * Provides cached agent reference resolver for the current server instance.
 *
 * @param options - Control cache invalidation behavior
 * @returns Resolver that expands `{name}`/`@id` tokens into URLs
 * @private
 */
export async function $provideAgentReferenceResolver(options?: {
    forceRefresh?: boolean;
}): Promise<AgentReferenceResolver> {
    const { forceRefresh = false } = options || {};
    const now = Date.now();

    if (forceRefresh) {
        $invalidateProvidedAgentReferenceResolverCache();
    }

    if (!forceRefresh && cachedResolver && cacheExpiresAt > now) {
        return cachedResolver;
    }

    const currentGeneration = resolverCacheGeneration;

    if (pendingResolver && pendingResolverGeneration === currentGeneration) {
        return pendingResolver;
    }

    pendingResolverGeneration = currentGeneration;
    pendingResolver = (async (): Promise<AgentReferenceResolver> => {
        try {
            const [collection, server, federatedServers] = await Promise.all([
                $provideAgentCollectionForServer(),
                $provideServer(),
                getFederatedServers(),
            ]);

            const resolver = await createServerAgentReferenceResolver({
                agentCollection: collection,
                localServerUrl: server.publicUrl.href,
                federatedServers,
            });

            if (resolverCacheGeneration === currentGeneration) {
                cachedResolver = resolver;
                cacheExpiresAt = Date.now() + CACHE_TTL_MS;
            }

            return resolver;
        } finally {
            if (pendingResolverGeneration === currentGeneration) {
                pendingResolver = null;
            }
        }
    })();

    return pendingResolver;
}
