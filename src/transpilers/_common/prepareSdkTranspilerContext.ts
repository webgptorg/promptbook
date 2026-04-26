import { createAgentModelRequirements } from '../../book-2.0/agent-source/createAgentModelRequirements';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { parseAgentSource } from '../../book-2.0/agent-source/parseAgentSource';
import { parseAgentSourceWithCommitments } from '../../book-2.0/agent-source/parseAgentSourceWithCommitments';
import { resolvePseudoAgentKindFromUrl } from '../../book-2.0/agent-source/pseudoAgentReferences';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { getAllCommitmentDefinitions } from '../../commitments/_common/getAllCommitmentDefinitions';
import type { LlmToolDefinition } from '../../types/LlmToolDefinition';
import type { BookTranspilerOptions } from './BookTranspilerOptions';
import {
    collectTranspiledTeamMembers,
    createTranspiledTeamToolDefinitions,
    type TranspiledTeamMember,
} from './TranspiledTeamMember';

/**
 * Knowledge-size threshold after which SDK transpilers switch to retrieval-based scaffolding.
 *
 * @private shared between SDK transpilers
 */
const SDK_TRANSPILER_KNOWLEDGE_THRESHOLD = 1000;

/**
 * Parsed data shared by SDK-oriented transpilers.
 *
 * @private shared between SDK transpilers
 */
export type PreparedSdkTranspilerContext = {
    /**
     * Parsed agent name used in the generated CLI harness.
     */
    readonly agentName: string;

    /**
     * Fully compiled model requirements generated from the Book source.
     */
    readonly modelRequirements: AgentModelRequirements;

    /**
     * Inline knowledge snippets embedded directly into the generated harness.
     */
    readonly directKnowledge: Array<string>;

    /**
     * Remote or file-based knowledge sources loaded by the generated harness at runtime.
     */
    readonly knowledgeSources: Array<string>;

    /**
     * Tool implementations extracted from commitment definitions and embedded into the harness.
     */
    readonly usedToolFunctions: Record<string, string>;

    /**
     * Tool definitions compiled from the Book source together with any baked TEAM hierarchy.
     */
    readonly toolDefinitions: Array<LlmToolDefinition>;

    /**
     * TEAM hierarchy baked into the transpiled output.
     */
    readonly teamHierarchy: ReadonlyArray<TranspiledTeamMember>;

    /**
     * Whether the transpiler should emit the retrieval-augmented scaffold.
     */
    readonly isKnowledgeHandledWithRetrieval: boolean;
};

/**
 * Prepares the common parsed context reused by JavaScript SDK transpilers.
 *
 * @param book - Agent Book source being transpiled.
 * @param options - Transpiler options that may include a pre-resolved TEAM hierarchy.
 * @returns Shared transpiler context derived from the Book.
 * @private shared between SDK transpilers
 */
export async function prepareSdkTranspilerContext(
    book: string_book,
    options?: BookTranspilerOptions,
): Promise<PreparedSdkTranspilerContext> {
    const { agentName } = await parseAgentSource(book);
    const modelRequirements = await createAgentModelRequirements(book);
    const teamHierarchy = options?.teamHierarchy ?? createDirectTranspiledTeamHierarchy(modelRequirements);
    const teamToolDefinitions = createTranspiledTeamToolDefinitions(teamHierarchy);
    const rootToolDefinitions = modelRequirements.tools || [];
    const toolDefinitions = mergeToolDefinitions(rootToolDefinitions, teamToolDefinitions);
    const excludedToolNames = new Set(collectTranspiledTeamMembers(teamHierarchy).map((teamMember) => teamMember.toolName));
    const { commitments } = parseAgentSourceWithCommitments(book);
    const knowledgeCommitments = commitments.filter((commitment) => commitment.type === 'KNOWLEDGE');
    const knowledgeContent = knowledgeCommitments.map((commitment) => commitment.content.trim());
    const directKnowledge = knowledgeContent.filter((content) => !isKnowledgeSourceUrl(content));
    const knowledgeSources = knowledgeContent.filter((content) => isKnowledgeSourceUrl(content));
    const isKnowledgeHandledWithRetrieval =
        directKnowledge.join('\n').length > SDK_TRANSPILER_KNOWLEDGE_THRESHOLD || knowledgeSources.length > 0;

    return {
        agentName,
        modelRequirements,
        directKnowledge,
        knowledgeSources,
        usedToolFunctions: resolveUsedToolFunctions(rootToolDefinitions, excludedToolNames),
        toolDefinitions,
        teamHierarchy,
        isKnowledgeHandledWithRetrieval,
    };
}

/**
 * Detects whether one knowledge commitment points to a URL instead of inline text.
 *
 * @param knowledgeContent - Raw commitment content.
 * @returns `true` when the content parses as a URL.
 */
function isKnowledgeSourceUrl(knowledgeContent: string): boolean {
    try {
        new URL(knowledgeContent);
        return true;
    } catch {
        return false;
    }
}

/**
 * Resolves concrete tool-function implementations referenced by compiled model requirements.
 *
 * @param tools - Tool definitions exposed to the model.
 * @returns Tool implementation source indexed by tool name.
 */
function resolveUsedToolFunctions(
    tools: ReadonlyArray<LlmToolDefinition>,
    excludedToolNames: ReadonlySet<string>,
): Record<string, string> {
    const usedToolFunctions: Record<string, string> = {};
    const allCommitmentDefinitions = getAllCommitmentDefinitions();

    for (const tool of tools) {
        if (excludedToolNames.has(tool.name)) {
            continue;
        }

        for (const definition of allCommitmentDefinitions) {
            const toolFunctions = definition.getToolFunctions();
            if (toolFunctions[tool.name]) {
                usedToolFunctions[tool.name] = toolFunctions[tool.name]!.toString();
            }
        }
    }

    return usedToolFunctions;
}

/**
 * Creates a flat TEAM hierarchy from the model requirements metadata.
 *
 * This is used when the caller does not provide an already resolved hierarchy, so the transpiler
 * can still reflect direct teammates found in the Book source.
 *
 * @param modelRequirements - Compiled requirements generated from the Book source.
 * @returns Direct TEAM hierarchy reconstructed from the requirements metadata.
 *
 * @private shared between SDK transpilers
 */
function createDirectTranspiledTeamHierarchy(modelRequirements: AgentModelRequirements): Array<TranspiledTeamMember> {
    const metadata = modelRequirements._metadata || {};
    const teammates = Array.isArray(metadata.teammates) ? (metadata.teammates as Array<TeamMetadataTeammate>) : [];
    const preResolvedTeammateProfiles = (metadata.preResolvedTeammateProfiles ||
        {}) as Record<string, TeamMetadataTeammateProfile>;

    return teammates.map((teammate) => {
        const normalizedTeamMemberUrl = normalizeTranspilerTeamMemberUrl(teammate.url);
        const profile = preResolvedTeammateProfiles[normalizedTeamMemberUrl] || preResolvedTeammateProfiles[teammate.url];
        const personaDescription = profile?.personaDescription ?? null;
        const agentName = profile?.agentName || teammate.label || normalizedTeamMemberUrl;
        const pseudoAgentKind = resolvePseudoAgentKindFromUrl(normalizedTeamMemberUrl) || undefined;

        return {
            agentName,
            label: teammate.label || agentName,
            url: normalizedTeamMemberUrl as string_book,
            toolName: teammate.toolName,
            instructions: teammate.instructions || '',
            personaDescription,
            ...(pseudoAgentKind ? { pseudoAgentKind } : {}),
            teamMembers: [],
        };
    });
}

/**
 * Merges root and TEAM-specific tool definitions while keeping the first occurrence of each tool name.
 *
 * @param rootToolDefinitions - Tool definitions compiled from the root Book source.
 * @param teamToolDefinitions - Tool definitions generated from the baked TEAM hierarchy.
 * @returns Stable combined tool definition list.
 *
 * @private shared between SDK transpilers
 */
function mergeToolDefinitions(
    rootToolDefinitions: ReadonlyArray<LlmToolDefinition>,
    teamToolDefinitions: ReadonlyArray<LlmToolDefinition>,
): Array<LlmToolDefinition> {
    const mergedToolDefinitions: Array<LlmToolDefinition> = [];
    const seenToolNames = new Set<string>();

    for (const toolDefinition of [...rootToolDefinitions, ...teamToolDefinitions]) {
        if (seenToolNames.has(toolDefinition.name)) {
            continue;
        }

        seenToolNames.add(toolDefinition.name);
        mergedToolDefinitions.push(toolDefinition);
    }

    return mergedToolDefinitions;
}

/**
 * Normalizes a teammate URL used in transpiler context metadata.
 *
 * @param teamMemberUrl - Raw teammate URL.
 * @returns URL trimmed for stable deduplication and runtime output.
 *
 * @private shared between SDK transpilers
 */
function normalizeTranspilerTeamMemberUrl(teamMemberUrl: string): string {
    return teamMemberUrl.trim().replace(/\/+$/g, '');
}

/**
 * Metadata shape stored in compiled TEAM requirements.
 *
 * @private shared between SDK transpilers
 */
type TeamMetadataTeammate = {
    readonly url: string;
    readonly toolName: string;
    readonly label?: string;
    readonly instructions?: string;
};

/**
 * Metadata shape stored for pre-resolved teammate profiles.
 *
 * @private shared between SDK transpilers
 */
type TeamMetadataTeammateProfile = {
    readonly agentName: string;
    readonly personaDescription: string | null;
};
