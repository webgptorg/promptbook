import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * META COLOR commitment definition
 *
 * The META COLOR commitment sets the agent's accent color.
 * This commitment is special because it doesn't affect the system message,
 * but is handled separately in the parsing logic.
 *
 * Example usage in agent source:
 *
 * ```book
 * META COLOR #ff0000
 * META COLOR #00ff00
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class MetaColorCommitmentDefinition extends BaseCommitmentDefinition<'META COLOR'> {
    constructor() {
        super('META COLOR', ['COLOR']);
    }

    /**
     * Short one-line description of META COLOR.
     */
    get description(): string {
        return "Set the agent's accent color.";
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🎨';
    }

    /**
     * Markdown documentation for META COLOR commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # META COLOR

            Sets the agent's accent color.

            ## Key aspects

            - Does not modify the agent's behavior or responses.
            - Only one \`META COLOR\` should be used per agent.
            - If multiple are specified, the last one takes precedence.
            - Used for visual representation in user interfaces.

            ## Examples

            \`\`\`book
            Professional Assistant

            META COLOR #3498db
            PERSONA You are a professional business assistant
            \`\`\`

            \`\`\`book
            Creative Helper

            META COLOR #e74c3c
            PERSONA You are a creative and inspiring assistant
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        TODO_USE(content);

        // META COLOR doesn't modify the system message or model requirements
        // It's handled separately in the parsing logic for profile color extraction
        // This method exists for consistency with the CommitmentDefinition interface
        return requirements;
    }

    /**
     * Extracts the profile color from the content
     * This is used by the parsing logic
     */
    extractProfileColor(content: string): string | null {
        const trimmedContent = content.trim();
        return trimmedContent || null;
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
