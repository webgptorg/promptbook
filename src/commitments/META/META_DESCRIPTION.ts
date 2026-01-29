import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * META DESCRIPTION commitment definition
 *
 * The META DESCRIPTION commitment sets the agent's meta description for the profile page.
 * This commitment is special because it doesn't affect the system message,
 * but is handled separately in the parsing logic.
 *
 * Example usage in agent source:
 *
 * ```book
 * META DESCRIPTION An AI assistant specialized in business tasks
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class MetaDescriptionCommitmentDefinition extends BaseCommitmentDefinition<'META DESCRIPTION'> {
    public constructor() {
        super('META DESCRIPTION', ['DESCRIPTION']);
    }

    /**
     * Short one-line description of META DESCRIPTION.
     */
    get description(): string {
        return "Set the agent's meta description.";
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '📝';
    }

    /**
     * Markdown documentation for META DESCRIPTION commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # META DESCRIPTION

            Sets the agent's meta description for the profile page.

            ## Key aspects

            - Does not modify the agent's behavior or responses.
            - Only one \`META DESCRIPTION\` should be used per agent.
            - If multiple are specified, the last one takes precedence.
            - Used for SEO and display in user interfaces.
            - If not present, the agent description falls back to \`PERSONA\` or the first few lines of the agent source.

            ## Examples

            \`\`\`book
            Professional Assistant

            META DESCRIPTION Specialized in strategic planning and project management
            PERSONA You are a professional business assistant
            STYLE Maintain a formal and courteous tone
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        TODO_USE(content);

        // META DESCRIPTION doesn't modify the system message or model requirements
        // It's handled separately in the parsing logic
        return requirements;
    }

    /**
     * Extracts the meta description from the content
     * This is used by the parsing logic
     */
    extractMetaDescription(content: string): string | null {
        const trimmedContent = content.trim();
        return trimmedContent || null;
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
