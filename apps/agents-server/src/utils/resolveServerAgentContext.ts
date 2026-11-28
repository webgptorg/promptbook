import type { AgentReferenceResolver } from '../../../../src/book-2.0/agent-source/AgentReferenceResolver';
import type { AgentCollection } from '../../../../src/collection/agent-collection/AgentCollection';
import { resolveBookScopedAgentContext, type ResolvedBookScopedAgentContext } from './agentReferenceResolver/bookScopedAgentReferences';
import { createLocalAgentSourceImporter } from './createLocalAgentSourceImporter';
import { loadFederatedAgentImportConfiguration } from './federatedAgentImportConfiguration';
import { getWellKnownAgentUrl } from './getWellKnownAgentUrl';
import { resolveAgentStateFromSource, type ResolvedAgentState } from './resolveAgentStateFromSource';

/**
 * Fully resolved server-side agent context used by runtime, metadata, and API consumers.
 */
export type ResolvedServerAgentContext = ResolvedBookScopedAgentContext & ResolvedAgentState;

/**
 * Options for resolving one route/runtime agent identifier to canonical state.
 */
export type ResolveServerAgentContextOptions = {
    /**
     * Source collection used to load local agent sources.
     */
    readonly collection: AgentCollection;

    /**
     * Requested agent identifier (agent name, permanent id, or book-scoped id).
     */
    readonly agentIdentifier: string;

    /**
     * Public/current server origin used for local agent URLs.
     */
    readonly localServerUrl: string;

    /**
     * Optional fallback resolver for compact local/federated references.
     */
    readonly fallbackResolver?: AgentReferenceResolver;
};

/**
 * Resolves local/book-scoped context first, then derives the canonical resolved source/profile.
 *
 * @param options - Context dependencies for the current server/runtime request.
 * @returns Fully resolved agent context.
 */
export async function resolveServerAgentContext(
    options: ResolveServerAgentContextOptions,
): Promise<ResolvedServerAgentContext> {
    const bookScopedAgentContext = await resolveBookScopedAgentContext(options);
    const federatedAgentImportConfiguration = await loadFederatedAgentImportConfiguration();
    const adamAgentUrl = await getWellKnownAgentUrl('ADAM');
    const agentSourceImporter = createLocalAgentSourceImporter({
        collection: options.collection,
        localServerUrls: [options.localServerUrl],
        localAgentUrls: [adamAgentUrl],
        adamAgentUrl,
        fallbackResolver: options.fallbackResolver,
        federatedAgentImportConfiguration,
    });
    const resolvedAgentState = await resolveAgentStateFromSource(bookScopedAgentContext.unresolvedAgentSource, {
        adamAgentUrl,
        canonicalAgentUrl: bookScopedAgentContext.canonicalAgentUrl,
        currentAgentAliases: bookScopedAgentContext.currentAgentAliases,
        agentReferenceResolver: bookScopedAgentContext.scopedAgentReferenceResolver,
        federatedAgentImportConfiguration,
        agentSourceImporter,
    });

    return {
        ...bookScopedAgentContext,
        ...resolvedAgentState,
    };
}
