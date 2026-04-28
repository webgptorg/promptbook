import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { PseudoAgentKind } from '../../book-2.0/agent-source/pseudoAgentReferences';
import type { LlmToolDefinition } from '../../types/LlmToolDefinition';

/**
 * Model-requirement fields embedded for one built-in teammate in transpiled code.
 */
export type TranspiledTeamAgentModelRequirements = Pick<
    AgentModelRequirements,
    'systemMessage' | 'promptSuffix' | 'modelName' | 'temperature' | 'topP' | 'topK' | 'knowledgeSources' | 'samples'
> & {
    /**
     * Tool definitions visible to this built-in teammate.
     */
    readonly tools: ReadonlyArray<LlmToolDefinition>;
};

/**
 * One TEAM edge embedded into transpiled code.
 */
export type TranspiledTeamTeammate = {
    /**
     * Canonical teammate URL.
     */
    readonly url: string;

    /**
     * Human-readable teammate label.
     */
    readonly label: string;

    /**
     * Tool name used by the owning agent to consult this teammate.
     */
    readonly toolName: string;

    /**
     * Optional instructions from the TEAM commitment.
     */
    readonly instructions?: string;

    /**
     * Pseudo-agent kind for `{User}` and `{Void}` teammates.
     */
    readonly pseudoAgentKind?: PseudoAgentKind;
};

/**
 * One agent node embedded into a transpiled TEAM hierarchy.
 */
export type TranspiledTeamAgent = {
    /**
     * Canonical URL used as the stable team-member identifier.
     */
    readonly url: string;

    /**
     * Human-readable agent name.
     */
    readonly agentName: string;

    /**
     * Resolved Book source for this agent.
     */
    readonly agentSource: string_book;

    /**
     * Compiled model requirements used by the exported harness.
     */
    readonly modelRequirements: TranspiledTeamAgentModelRequirements;

    /**
     * Teammates directly available to this agent.
     */
    readonly teammates: ReadonlyArray<TranspiledTeamTeammate>;

    /**
     * Marks the root exported agent in the hierarchy.
     */
    readonly isRootAgent?: boolean;
};

/**
 * Full built-in TEAM hierarchy embedded into transpiled code.
 */
export type TranspiledTeamExport = {
    /**
     * Canonical URL of the root exported agent.
     */
    readonly rootAgentUrl: string;

    /**
     * Root agent and all reachable teammates.
     */
    readonly agents: ReadonlyArray<TranspiledTeamAgent>;
};
