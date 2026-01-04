import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { Promisable } from 'type-fest';
import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

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
 * @private [đźŞ”] Maybe export the commitments through some package
 */
export class NoteCommitmentDefinition extends BaseCommitmentDefinition<'NOTE' | 'NOTES' | 'COMMENT' | 'NONCE'> {
    constructor(type: 'NOTE' | 'NOTES' | 'COMMENT' | 'NONCE' = 'NOTE') {
        super(type);
    }

    /**
     * Short one-line description of NOTE.
     */
    get description(): string {
        return 'Add developer-facing notes without changing behavior or output.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return 'đź“ť';
    }

    /**
     * Markdown documentation for NOTE commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Adds comments for documentation without changing agent behavior.

            ## Key aspects

            - Does not modify the agent's behavior or responses.
            - Multiple \`NOTE\`, \`NOTES\`, \`COMMENT\`, and \`NONCE\` commitments are aggregated for debugging.
            - All four terms work identically and can be used interchangeably.
            - Useful for documenting design decisions and reminders.
            - Content is preserved in metadata for inspection.

            ## Examples

            \`\`\`book
            Customer Support Bot

            NOTE This agent was designed for customer support scenarios
            COMMENT Remember to update the knowledge base monthly
            PERSONA You are a helpful customer support representative
            KNOWLEDGE Company policies and procedures
            RULE Always be polite and professional
            \`\`\`

            \`\`\`book
            Research Assistant

            NONCE Performance optimized for quick response times
            NOTE Uses RAG for accessing latest research papers
            PERSONA You are a knowledgeable research assistant
            ACTION Can help with literature reviews and citations
            STYLE Present information in academic format
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string, _tools: Pick<ExecutionTools, 'fs' | 'scrapers'>): Promisable<AgentModelRequirements> {
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
 * [đź’ž] Ignore a discrepancy between file name and entity name
 */
