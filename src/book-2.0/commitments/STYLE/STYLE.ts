import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import type { AgentModelRequirements } from '../_misc/AgentModelRequirements';

/**
 * STYLE commitment definition
 *
 * The STYLE commitment defines how the agent should format and present its responses.
 * This includes tone, writing style, formatting preferences, and communication patterns.
 *
 * Example usage in agent source:
 * ```
 * STYLE Write in a professional but friendly tone, use bullet points for lists
 * STYLE Always provide code examples when explaining programming concepts
 * ```
 */
export class StyleCommitmentDefinition extends BaseCommitmentDefinition {
    constructor() {
        super('STYLE');
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        // Add style instructions to the system message
        const styleSection = `Style: ${trimmedContent}`;

        return this.appendToSystemMessage(requirements, styleSection, '\n\n');
    }
}

/**
 * Singleton instance of the STYLE commitment definition
 */
export const StyleCommitment = new StyleCommitmentDefinition();

/**
 * [💞] Ignore a discrepancy between file name and entity name
 */
