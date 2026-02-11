import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideServer } from '@/src/tools/$provideServer';
import { AgentReferenceResolver } from '../../../../../src/book-2.0/agent-source/AgentReferenceResolver-x';
import { getFederatedServers } from '../getFederatedServers';
import { createServerAgentReferenceResolver } from './createServerAgentReferenceResolver';

const CACHE_TTL_MS = 5000;
let cachedResolver: AgentReferenceResolver | null = null;
let cacheExpiresAt = 0;
let pendingResolver: Promise<AgentReferenceResolver> | null = null;

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

    if (!forceRefresh && cachedResolver && cacheExpiresAt > now) {
        return cachedResolver;
    }

    if (pendingResolver) {
        return pendingResolver;
    }

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

            cachedResolver = resolver;
            cacheExpiresAt = Date.now() + CACHE_TTL_MS;

            return resolver;
        } finally {
            pendingResolver = null;
        }
    })();

    return pendingResolver;
}
