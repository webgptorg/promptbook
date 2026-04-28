import { createAgentModelRequirements } from '../../book-2.0/agent-source/createAgentModelRequirements';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { parseAgentSource } from '../../book-2.0/agent-source/parseAgentSource';
import { parseAgentSourceWithCommitments } from '../../book-2.0/agent-source/parseAgentSourceWithCommitments';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { getAllCommitmentDefinitions } from '../../commitments/_common/getAllCommitmentDefinitions';
import type { LlmToolDefinition } from '../../types/LlmToolDefinition';
import type { BookTranspilerOptions } from './BookTranspilerOptions';
import {
    normalizeTranspiledTeamHierarchy,
    type TranspiledTeamMember,
    type TranspiledTeamMemberInput,
} from './TranspiledTeamHierarchy';

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
     * Recursive TEAM hierarchy embedded into the generated harness.
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
 * @param options - Optional transpiler options including a pre-resolved TEAM hierarchy.
 * @returns Shared transpiler context derived from the Book.
 *
 * @private shared between SDK transpilers
 */
export async function prepareSdkTranspilerContext(
    book: string_book,
    options?: BookTranspilerOptions,
): Promise<PreparedSdkTranspilerContext> {
    const { agentName } = await parseAgentSource(book);
    const modelRequirements = await createAgentModelRequirements(book);
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
        usedToolFunctions: resolveUsedToolFunctions(modelRequirements.tools || []),
        teamHierarchy: normalizeTranspiledTeamHierarchy(
            (options?.teamHierarchy || (modelRequirements._metadata?.teammates || [])) as ReadonlyArray<TranspiledTeamMemberInput>,
        ),
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
function resolveUsedToolFunctions(tools: ReadonlyArray<LlmToolDefinition>): Record<string, string> {
    const usedToolFunctions: Record<string, string> = {};
    const allCommitmentDefinitions = getAllCommitmentDefinitions();

    for (const tool of tools) {
        if (tool.name.startsWith('team_chat_')) {
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
