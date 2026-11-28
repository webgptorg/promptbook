import type { string_book } from '../../../../src/book-2.0/agent-source/string_book';
import {
    resolveInheritedAgentSource as resolveAgentSource,
    type ResolveInheritedAgentSourceOptions as SharedResolveInheritedAgentSourceOptions,
    type AgentSourceImporterContext as SharedAgentSourceImporterContext,
} from '../../../../src/book-2.0/agent-source/resolveInheritedAgentSource';
import type { string_agent_url } from '../../../../src/types/string_agent_url';
import {
    DEFAULT_FEDERATED_AGENT_IMPORT_CONFIGURATION,
    type FederatedAgentImportConfiguration,
} from '../constants/federatedAgentImport';
import { importAgentWithFallback } from './importAgentWithFallback';

/**
 * Context passed to a same-instance importer, including the server's HTTP retry policy.
 */
export type AgentSourceImporterContext = SharedAgentSourceImporterContext & {
    readonly federatedAgentImportConfiguration: FederatedAgentImportConfiguration;
};

/**
 * Imports resolved same-instance sources, returning `null` for URLs owned by another server.
 */
export type AgentSourceImporter = (
    agentUrl: string_agent_url,
    context: AgentSourceImporterContext,
) => Promise<string_book | null>;

/**
 * Server transport options for the shared Book inheritance resolver.
 */
type ResolveInheritedAgentSourceOptions = Omit<SharedResolveInheritedAgentSourceOptions, 'agentSourceImporter'> & {
    readonly federatedAgentImportConfiguration?: FederatedAgentImportConfiguration;
    readonly agentSourceImporter?: AgentSourceImporter;
};

/**
 * Applies the shared inheritance rules using same-instance loading and the server's HTTP fallback.
 */
export function resolveInheritedAgentSource(
    agentSource: string_book,
    options: ResolveInheritedAgentSourceOptions = {},
): Promise<string_book> {
    const federatedAgentImportConfiguration =
        options.federatedAgentImportConfiguration || DEFAULT_FEDERATED_AGENT_IMPORT_CONFIGURATION;

    return resolveAgentSource(agentSource, {
        ...options,
        agentSourceImporter: async (agentUrl, context) => {
            const localSource = await options.agentSourceImporter?.(agentUrl, {
                ...context,
                federatedAgentImportConfiguration,
            });

            return (
                localSource ??
                importAgentWithFallback(agentUrl, context.importAgentOptions, federatedAgentImportConfiguration)
            );
        },
    });
}
