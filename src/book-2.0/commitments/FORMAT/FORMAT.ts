import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import type { AgentModelRequirements } from '../_misc/AgentModelRequirements';

/**
 * FORMAT commitment definition
 *
 * The FORMAT commitment defines the specific output structure and formatting
 * that the agent should use in its responses. This includes data formats,
 * response templates, and structural requirements.
 *
 * Example usage in agent source:
 * ```
 * FORMAT Always respond in JSON format with 'status' and 'data' fields
 * FORMAT Use markdown formatting for all code blocks
 * ```
 */
export class FormatCommitmentDefinition extends BaseCommitmentDefinition {
    constructor() {
        super('FORMAT');
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        // Add format instructions to the system message
        const formatSection = `Output Format: ${trimmedContent}`;

        return this.appendToSystemMessage(requirements, formatSection, '\n\n');
    }
}

/**
 * Singleton instance of the FORMAT commitment definition
 */
export const FormatCommitment = new FormatCommitmentDefinition();
