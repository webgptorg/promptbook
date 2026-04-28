import { createAgentModelRequirements, parseAgentSource } from '@promptbook-local/core';
import type { AgentReferenceResolver } from '../../../../../src/book-2.0/agent-source/AgentReferenceResolver';
import { resolvePseudoAgentKindFromUrl } from '../../../../../src/book-2.0/agent-source/pseudoAgentReferences';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import type { string_agent_url } from '../../../../../src/types/typeAliases';
import {
    createTranspiledTeamAgentModelRequirements,
    extractTranspiledTeamTeammates,
} from '../../../../../src/transpilers/_common/createTranspiledTeamRuntimeSection';
import type {
    TranspiledTeamAgent,
    TranspiledTeamExport,
    TranspiledTeamTeammate,
} from '../../../../../src/transpilers/_common/TranspiledTeamExport';
import type { FederatedAgentImportConfiguration } from '../../constants/federatedAgentImport';
import { loadFederatedAgentImportConfiguration } from '../federatedAgentImportConfiguration';
import { importAgentWithFallback } from '../importAgentWithFallback';

/**
 * Options for building the built-in TEAM hierarchy used by transpiled exports.
 */
export type ResolveTranspiledTeamExportOptions = {
    /**
     * Canonical URL of the exported root agent.
     */
    readonly rootAgentUrl: string_agent_url;

    /**
     * Resolved source of the exported root agent.
     */
    readonly rootAgentSource: string_book;

    /**
     * Resolver shared with the runtime source resolution path.
     */
    readonly agentReferenceResolver: AgentReferenceResolver;

    /**
     * Retry settings reused when teammate sources are fetched from federated servers.
     */
    readonly federatedAgentImportConfiguration?: FederatedAgentImportConfiguration;
};

/**
 * Maximum number of agent nodes embedded in one transpiled TEAM hierarchy.
 */
const MAX_TRANSPILED_TEAM_AGENT_COUNT = 100;

/**
 * Creates the built-in TEAM hierarchy for a transpiled export.
 *
 * @param options - Root source and resolver dependencies.
 * @returns Built-in TEAM hierarchy, or `null` when the root agent has no teammates.
 */
export async function resolveTranspiledTeamExport(
    options: ResolveTranspiledTeamExportOptions,
): Promise<TranspiledTeamExport | null> {
    const federatedAgentImportConfiguration =
        options.federatedAgentImportConfiguration || (await loadFederatedAgentImportConfiguration());
    const rootAgent = await createTranspiledTeamAgentFromSource({
        agentUrl: options.rootAgentUrl,
        agentSource: options.rootAgentSource,
        agentReferenceResolver: options.agentReferenceResolver,
        isRootAgent: true,
    });

    if (rootAgent.teammates.length === 0) {
        return null;
    }

    const agentsByUrl = new Map<string, TranspiledTeamAgent>();
    const pendingTeammates: TranspiledTeamTeammate[] = [...rootAgent.teammates];
    agentsByUrl.set(rootAgent.url, rootAgent);

    while (pendingTeammates.length > 0 && agentsByUrl.size < MAX_TRANSPILED_TEAM_AGENT_COUNT) {
        const teammate = pendingTeammates.shift()!;

        if (agentsByUrl.has(teammate.url)) {
            continue;
        }

        const teammateAgent = await resolveTranspiledTeamMemberAgent({
            teammate,
            agentReferenceResolver: options.agentReferenceResolver,
            federatedAgentImportConfiguration,
        });

        agentsByUrl.set(teammateAgent.url, teammateAgent);
        pendingTeammates.push(...teammateAgent.teammates);
    }

    return {
        rootAgentUrl: options.rootAgentUrl,
        agents: [...agentsByUrl.values()],
    };
}

/**
 * Resolves one teammate node, including pseudo-agent fallbacks.
 *
 * @param options - Teammate and resolver dependencies.
 * @returns Embedded teammate agent node.
 */
async function resolveTranspiledTeamMemberAgent(options: {
    readonly teammate: TranspiledTeamTeammate;
    readonly agentReferenceResolver: AgentReferenceResolver;
    readonly federatedAgentImportConfiguration: FederatedAgentImportConfiguration;
}): Promise<TranspiledTeamAgent> {
    const pseudoAgentKind = resolvePseudoAgentKindFromUrl(options.teammate.url);

    if (pseudoAgentKind) {
        return createPseudoTranspiledTeamAgent(options.teammate);
    }

    const agentSource = await importAgentWithFallback(
        options.teammate.url as string_agent_url,
        {
            recursionLevel: 0,
        },
        options.federatedAgentImportConfiguration,
    );

    return createTranspiledTeamAgentFromSource({
        agentUrl: options.teammate.url as string_agent_url,
        agentSource,
        agentReferenceResolver: options.agentReferenceResolver,
        isRootAgent: false,
    });
}

/**
 * Creates an embedded team node from a resolved Book source.
 *
 * @param options - Source and resolver dependencies.
 * @returns Embedded team-agent node.
 */
async function createTranspiledTeamAgentFromSource(options: {
    readonly agentUrl: string_agent_url;
    readonly agentSource: string_book;
    readonly agentReferenceResolver: AgentReferenceResolver;
    readonly isRootAgent: boolean;
}): Promise<TranspiledTeamAgent> {
    const modelRequirements = await createAgentModelRequirements(
        options.agentSource,
        undefined,
        undefined,
        undefined,
        {
            agentReferenceResolver: options.agentReferenceResolver,
        },
    );
    const parsedAgentSource = parseAgentSource(options.agentSource);
    const agentName = parsedAgentSource.agentName || options.agentUrl;

    return {
        url: options.agentUrl,
        agentName,
        agentSource: options.agentSource,
        modelRequirements: createTranspiledTeamAgentModelRequirements(modelRequirements),
        teammates: extractTranspiledTeamTeammates(modelRequirements),
        isRootAgent: options.isRootAgent || undefined,
    };
}

/**
 * Creates a serializable pseudo-agent node for `{User}` and `{Void}` teammates.
 *
 * @param teammate - Pseudo teammate edge.
 * @returns Embedded pseudo-agent node.
 */
function createPseudoTranspiledTeamAgent(teammate: TranspiledTeamTeammate): TranspiledTeamAgent {
    const pseudoAgentKind = resolvePseudoAgentKindFromUrl(teammate.url);
    const systemMessage =
        pseudoAgentKind === 'USER'
            ? 'This pseudo-agent represents the human user. Ask for exactly one reply from the user.'
            : 'This pseudo-agent represents silence and intentionally does not answer.';
    const agentSource = `${teammate.label}\n\nNOTE Built-in ${pseudoAgentKind || 'pseudo'} TEAM pseudo-agent.\nCLOSED`;

    return {
        url: teammate.url,
        agentName: teammate.label,
        agentSource: agentSource as string_book,
        modelRequirements: {
            systemMessage,
            promptSuffix: '',
            modelName: 'pseudo-agent',
            tools: [],
        },
        teammates: [],
    };
}
