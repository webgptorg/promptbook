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
 *
 * ```book
 * FORMAT Always respond in JSON format with 'status' and 'data' fields
 * FORMAT Use markdown formatting for all code blocks
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class FormatCommitmentDefinition extends BaseCommitmentDefinition<'FORMAT'> {
    constructor() {
        super('FORMAT');
    }

    /**
     * Markdown documentation for FORMAT commitment.
     */
    get documentation(): string {
        return [
            '# FORMAT',
            '',
            'Defines the specific output structure and formatting for responses (data formats, templates, structure).',
            '',
            'Effects on system message:',
            '- Appends an "Output Format: ..." line to the system message.',
            '',
            'Examples:',
            '```book',
            "FORMAT Always respond in JSON format with 'status' and 'data' fields",
            'FORMAT Use markdown formatting for all code blocks',
            '```',
            '',
        ].join('\n');
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
export const FormatCommitment = new FormatCommitmentDefinition();

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
