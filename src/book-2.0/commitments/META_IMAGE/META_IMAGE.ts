import { spaceTrim } from 'spacetrim';
import { TODO_USE } from '../../../utils/organization/TODO_USE';
import type { AgentModelRequirements } from '../../agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * META IMAGE commitment definition
 *
 * The META IMAGE commitment sets the agent's avatar/profile image URL.
 * This commitment is special because it doesn't affect the system message,
 * but is handled separately in the parsing logic.
 *
 * Example usage in agent source:
 *
 * ```book
 * META IMAGE https://example.com/avatar.jpg
 * META IMAGE /assets/agent-avatar.png
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class MetaImageCommitmentDefinition extends BaseCommitmentDefinition<'META IMAGE'> {
    constructor() {
        super('META IMAGE');
    }

    /**
     * Short one-line description of META IMAGE.
     */
    get description(): string {
        return "Set the agent's profile image URL.";
    }

    /**
     * Markdown documentation for META IMAGE commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # META IMAGE

            Sets the agent's avatar/profile image URL.

            ## Key behaviors

            - Does not modify the agent's behavior or responses.
            - Only one \`META IMAGE\` should be used per agent.
            - If multiple are specified, the last one takes precedence.
            - Used for visual representation in user interfaces.

            ## Examples

            \`\`\`book
            Professional Assistant

            META IMAGE https://example.com/professional-avatar.jpg
            PERSONA You are a professional business assistant
            STYLE Maintain a formal and courteous tone
            \`\`\`

            \`\`\`book
            Creative Helper

            META IMAGE /assets/creative-bot-avatar.png
            PERSONA You are a creative and inspiring assistant
            STYLE Be enthusiastic and encouraging
            ACTION Can help with brainstorming and ideation
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        TODO_USE(content);

        // META IMAGE doesn't modify the system message or model requirements
        // It's handled separately in the parsing logic for profile image extraction
        // This method exists for consistency with the CommitmentDefinition interface
        return requirements;
    }

    /**
     * Extracts the profile image URL from the content
     * This is used by the parsing logic
     */
    extractProfileImageUrl(content: string): string | null {
        const trimmedContent = content.trim();
        return trimmedContent || null;
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
