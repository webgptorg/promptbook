import { spaceTrim } from 'spacetrim';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import type { AgentModelRequirements } from '../_misc/AgentModelRequirements';

/**
 * NOTE commitment definition
 *
 * The NOTE commitment is used to add comments to the agent source without making any changes
 * to the system message or agent model requirements. It serves as a documentation mechanism
 * for developers to add explanatory comments, reminders, or annotations directly in the agent source.
 *
 * Key features:
 * - Makes no changes to the system message
 * - Makes no changes to agent model requirements
 * - Content is preserved in metadata.NOTE for debugging and inspection
 * - Multiple NOTE commitments are aggregated together
 * - Comments (# NOTE) are removed from the final system message
 *
 * Example usage in agent source:
 *
 * ```book
 * NOTE This agent was designed for customer support scenarios
 * NOTE Remember to update the knowledge base monthly
 * NOTE Performance optimized for quick response times
 * ```
 *
 * The above notes will be stored in metadata but won't affect the agent's behavior.
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class NoteCommitmentDefinition extends BaseCommitmentDefinition<'NOTE'> {
    constructor() {
        super('NOTE');
    }

    /**
     * Short one-line description of NOTE.
     */
    get description(): string {
        return 'Add developer-facing notes without changing behavior or output.';
    }

    /**
     * Markdown documentation for NOTE commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # NOTE

            Adds comments for documentation without changing system message or model requirements.

            Key behaviors:
            - Makes no changes to the system message.
            - Makes no changes to requirements.
            - Aggregates multiple NOTE lines into metadata.NOTE.

            Examples:
            \`\`\`book
            NOTE This agent was designed for customer support scenarios
            NOTE Remember to update the knowledge base monthly
            NOTE Performance optimized for quick response times
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        // The NOTE commitment makes no changes to the system message or model requirements
        // It only stores the note content in metadata for documentation purposes
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        // Get existing note content from metadata
        const existingNoteContent = requirements.metadata?.NOTE || '';

        // Merge the new content with existing note content
        // When multiple NOTE commitments exist, they are aggregated together
        const mergedNoteContent = existingNoteContent ? `${existingNoteContent}\n${trimmedContent}` : trimmedContent;

        // Store the merged note content in metadata for debugging and inspection
        const updatedMetadata = {
            ...requirements.metadata,
            NOTE: mergedNoteContent,
        };

        // Return requirements with updated metadata but no changes to system message
        return {
            ...requirements,
            metadata: updatedMetadata,
        };
    }
}

/**
 * Singleton instance of the NOTE commitment definition
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export const NoteCommitment = new NoteCommitmentDefinition();

/**
 * [💞] Ignore a discrepancy between file name and entity name
 */
