import type { AgentReferenceResolver } from '../../../../src/book-2.0/agent-source/AgentReferenceResolver';
import type { AgentCollection } from '../../../../src/collection/agent-collection/AgentCollection';
import { DEFAULT_MAX_RECURSION } from '../../../../src/config';
import { NotFoundError } from '../../../../src/errors/NotFoundError';
import { ParseError } from '../../../../src/errors/ParseError';
import type { string_agent_url } from '../../../../src/types/typeAliases';
import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';
import type { FederatedAgentImportConfiguration } from '../constants/federatedAgentImport';
import {
    resolveBookScopedAgentContext,
    type ResolvedBookScopedAgentContext,
} from './agentReferenceResolver/bookScopedAgentReferences';
import {
    createLocalAgentUrl,
    normalizeLocalAgentUrlReferences,
    normalizeLocalServerUrls,
    resolveLocalAgentRouteReference,
} from './localAgentRouteReferences';
import { createMissingImportedAgentFallback } from './createMissingImportedAgentFallback';
import {
    resolveInheritedAgentSource,
    type AgentSourceImporter,
} from './resolveInheritedAgentSource';

/**
 * Dependencies needed for importing same-instance agent sources without HTTP.
 */
export type CreateLocalAgentSourceImporterOptions = {
    /**
     * Collection used to load local regular and book-scoped agent sources.
     */
    readonly collection: Pick<AgentCollection, 'getAgentPermanentId' | 'getAgentSource'>;

    /**
     * Server origins that should be treated as this Agents Server instance.
     */
    readonly localServerUrls: ReadonlyArray<string>;

    /**
     * Exact agent URLs that should be treated as local even when their origin is not in `localServerUrls`.
     */
    readonly localAgentUrls?: ReadonlyArray<string_agent_url>;

    /**
     * Adam agent URL used for implicit default inheritance.
     */
    readonly adamAgentUrl: string_agent_url;

    /**
     * Resolver used for compact references that are not book-scoped.
     */
    readonly fallbackResolver?: AgentReferenceResolver;

    /**
     * Retry configuration used when nested imports leave the local server.
     */
    readonly federatedAgentImportConfiguration?: FederatedAgentImportConfiguration;
};

/**
 * Creates an importer that loads same-instance agent URLs directly from the collection.
 *
 * @param options - Same-instance import dependencies.
 * @returns Importer suitable for `resolveInheritedAgentSource`.
 */
export function createLocalAgentSourceImporter(options: CreateLocalAgentSourceImporterOptions): AgentSourceImporter {
    const localServerUrls = normalizeLocalServerUrls(options.localServerUrls);
    const localAgentUrlReferences = normalizeLocalAgentUrlReferences(options.localAgentUrls || []);
    const localAgentSourceImporter: AgentSourceImporter = async (agentUrl, context) => {
        const localRouteReference = resolveLocalAgentRouteReference(agentUrl, localServerUrls, localAgentUrlReferences);

        if (!localRouteReference) {
            return null;
        }

        const nextRecursionLevel = (context.importAgentOptions.recursionLevel || 0) + 1;
        assertRecursionLevel(nextRecursionLevel, agentUrl);

        let resolvedAgentContext: ResolvedBookScopedAgentContext;

        try {
            resolvedAgentContext = await resolveBookScopedAgentContext({
                collection: options.collection,
                agentIdentifier: localRouteReference.agentIdentifier,
                localServerUrl: localRouteReference.localServerUrl,
                fallbackResolver: options.fallbackResolver,
            });
        } catch (error) {
            if (error instanceof NotFoundError) {
                return createMissingImportedAgentFallback(agentUrl, 1, error);
            }

            throw error;
        }

        return resolveInheritedAgentSource(resolvedAgentContext.unresolvedAgentSource, {
            adamAgentUrl: options.adamAgentUrl,
            recursionLevel: nextRecursionLevel,
            inheritancePath: context.importAgentOptions.inheritancePath,
            currentAgentUrl: resolvedAgentContext.canonicalAgentUrl,
            currentAgentAliases: createCurrentAgentAliases(resolvedAgentContext, localServerUrls),
            agentReferenceResolver: resolvedAgentContext.scopedAgentReferenceResolver,
            federatedAgentImportConfiguration:
                options.federatedAgentImportConfiguration || context.federatedAgentImportConfiguration,
            agentSourceImporter: localAgentSourceImporter,
        });
    };

    return localAgentSourceImporter;
}

/**
 * Throws when direct local importing would exceed the configured recursion limit.
 *
 * @param recursionLevel - Next recursion level.
 * @param agentUrl - Local agent URL being imported.
 */
function assertRecursionLevel(recursionLevel: number, agentUrl: string_agent_url): void {
    if (recursionLevel <= DEFAULT_MAX_RECURSION) {
        return;
    }

    throw new ParseError(
        spaceTrim(
            (block) => `
                Recursion depth ${recursionLevel} exceeds maximum allowed ${DEFAULT_MAX_RECURSION} while importing local agent:

                ${block(agentUrl)}
            `,
        ),
    );
}

/**
 * Builds cycle-detection aliases for every same-instance origin.
 *
 * @param resolvedAgentContext - Resolved local/book-scoped agent context.
 * @param localServerUrls - Same-instance server origins.
 * @returns Unique local URL aliases for the imported agent.
 */
function createCurrentAgentAliases(
    resolvedAgentContext: ResolvedBookScopedAgentContext,
    localServerUrls: ReadonlyArray<string>,
): Array<string_agent_url> {
    const agentIdentifiers = [
        resolvedAgentContext.canonicalAgentIdentifier,
        resolvedAgentContext.requestedAgentIdentifier,
        resolvedAgentContext.resolvedAgentName,
    ].filter((agentIdentifier, index, agentIdentifierList) => agentIdentifierList.indexOf(agentIdentifier) === index);
    const agentAliases = new Set<string>(resolvedAgentContext.currentAgentAliases);

    for (const localServerUrl of localServerUrls) {
        for (const agentIdentifier of agentIdentifiers) {
            agentAliases.add(createLocalAgentUrl(localServerUrl, agentIdentifier));
        }
    }

    return [...agentAliases] as Array<string_agent_url>;
}
