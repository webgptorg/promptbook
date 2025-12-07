import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * META FONT commitment definition
 *
 * The META FONT commitment sets the agent's font.
 * This commitment is special because it doesn't affect the system message,
 * but is handled separately in the parsing logic.
 *
 * Example usage in agent source:
 *
 * ```book
 * META FONT Poppins, Arial, sans-serif
 * META FONT Roboto
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class MetaFontCommitmentDefinition extends BaseCommitmentDefinition<'META FONT'> {
    constructor() {
        super('META FONT', ['FONT']);
    }

    /**
     * Short one-line description of META FONT.
     */
    get description(): string {
        return "Set the agent's font.";
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🔤';
    }

    /**
     * Markdown documentation for META FONT commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # META FONT

            Sets the agent's font.

            ## Key aspects

            - Does not modify the agent's behavior or responses.
            - Only one \`META FONT\` should be used per agent.
            - If multiple are specified, the last one takes precedence.
            - Used for visual representation in user interfaces.
            - Supports Google Fonts.

            ## Examples

            \`\`\`book
            Modern Assistant

            META FONT Poppins, Arial, sans-serif
            PERSONA You are a modern assistant
            \`\`\`

            \`\`\`book
            Classic Helper

            META FONT Times New Roman
            PERSONA You are a classic helper
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        TODO_USE(content);

        // META FONT doesn't modify the system message or model requirements
        // It's handled separately in the parsing logic
        // This method exists for consistency with the CommitmentDefinition interface
        return requirements;
    }

    /**
     * Extracts the font from the content
     * This is used by the parsing logic
     */
    extractProfileFont(content: string): string | null {
        const trimmedContent = content.trim();
        return trimmedContent || null;
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
