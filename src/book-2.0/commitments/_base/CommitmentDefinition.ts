import type { AgentModelRequirements } from '../_misc/AgentModelRequirements';

/**
 * Definition of a commitment that can be applied to agent model requirements
 *
 * Each commitment is self-contained and manages its own logic for:
 * - Creating regex patterns for parsing
 * - Applying its effects to agent model requirements
 */

export interface CommitmentDefinition {
    /**
     * The type/name of this commitment (e.g., 'PERSONA', 'KNOWLEDGE', etc.)
     */
    readonly type: string;

    /**
     * Creates a regex pattern to match this commitment in agent source
     * This regex should capture the commitment content in a 'contents' named group
     *
     * @returns RegExp that matches the full commitment line
     */
    createRegex(): RegExp;

    /**
     * Creates a regex pattern to match just the commitment type
     * This is useful for checking if a line contains this commitment type
     *
     * @returns RegExp that matches just the commitment type
     */
    createTypeRegex(): RegExp;

    /**
     * Applies this commitment's logic to the agent model requirements
     * This method should be pure and return a new requirements object
     *
     * @param requirements Current agent model requirements
     * @param content The content part of the commitment (after the type)
     * @returns Updated agent model requirements
     */
    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements;
}
