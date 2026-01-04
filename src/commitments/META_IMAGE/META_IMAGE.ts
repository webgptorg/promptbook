import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { Promisable } from 'type-fest';
import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { TODO_USE } from '../../utils/organization/TODO_USE';
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
 * @private [đźŞ”] Maybe export the commitments through some package
 */
export class MetaImageCommitmentDefinition extends BaseCommitmentDefinition<'META IMAGE'> {
    constructor() {
        super('META IMAGE', ['IMAGE']);
    }

    /**
     * Short one-line description of META IMAGE.
     */
    get description(): string {
        return "Set the agent's profile image URL.";
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return 'đź–Ľď¸Ź';
    }

    /**
     * Markdown documentation for META IMAGE commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # META IMAGE

            Sets the agent's avatar/profile image URL.

            ## Key aspects

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

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string, _tools: Pick<ExecutionTools, 'fs' | 'scrapers'>): Promisable<AgentModelRequirements> {
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
 * Note: [đź’ž] Ignore a discrepancy between file name and entity name
 */
