import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * FORMAT commitment definition
 *
 * The FORMAT commitment defines the specific output structure and formatting
 * that the agent should use in its responses. This includes data formats,
 * response templates, and structural requirements.
 *
 * Example usage in agent source:
 *
 * ```book
 * FORMAT Always respond in JSON format with 'status' and 'data' fields
 * FORMAT Use markdown formatting for all code blocks
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class FormatCommitmentDefinition extends BaseCommitmentDefinition<'FORMAT' | 'FORMATS'> {
    constructor(type: 'FORMAT' | 'FORMATS' = 'FORMAT') {
        super(type);
    }

    /**
     * Short one-line description of FORMAT.
     */
    get description(): string {
        return 'Specify output structure or formatting requirements.';
    }

    /**
     * Markdown documentation for FORMAT commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Defines the specific output structure and formatting for responses (data formats, templates, structure).

            ## Key behaviors

            - Multiple \`FORMAT\` and \`FORMATS\` commitments are applied sequentially.
            - Both terms work identically and can be used interchangeably.
            - If they are in conflict, the last one takes precedence.
            - You can specify both data formats and presentation styles.

            ## Examples

            \`\`\`book
            Customer Support Bot

            PERSONA You are a helpful customer support agent
            FORMAT Always respond in JSON format with 'status' and 'data' fields
            FORMAT Use markdown formatting for all code blocks
            \`\`\`

            \`\`\`book
            Data Analyst

            PERSONA You are a data analysis expert
            FORMAT Present results in structured tables
            FORMAT Include confidence scores for all predictions
            STYLE Be concise and precise in explanations
            \`\`\`
        `);
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
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export const FormatCommitment = new FormatCommitmentDefinition('FORMAT');

/**
 * Singleton instance of the FORMATS commitment definition
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export const FormatsCommitment = new FormatCommitmentDefinition('FORMATS');

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
