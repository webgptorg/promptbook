import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * FORMAT commitment definition
 *
 * Deprecated legacy commitment for output formatting and response structure.
 * New books should prefer `WRITING SAMPLE` and `WRITING RULES`.
 *
 * Legacy example usage in agent source:
 *
 * ```book
 * FORMAT Always respond in JSON format with 'status' and 'data' fields
 * FORMAT Use markdown formatting for all code blocks
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class FormatCommitmentDefinition extends BaseCommitmentDefinition<'FORMAT' | 'FORMATS'> {
    public constructor(type: 'FORMAT' | 'FORMATS' = 'FORMAT') {
        super(type);
    }

    /**
     * Short one-line description of FORMAT.
     */
    get description(): string {
        return 'Deprecated legacy formatting commitment. Prefer `WRITING SAMPLE` and `WRITING RULES` for new books.';
    }

    /**
     * Optional UI/docs-only deprecation metadata.
     */
    public override get deprecation() {
        return {
            message: 'Use `WRITING SAMPLE` and `WRITING RULES` instead.',
            replacedBy: ['WRITING SAMPLE', 'WRITING RULES'],
        } as const;
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '📜';
    }

    /**
     * Markdown documentation for FORMAT commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Deprecated legacy commitment for output formatting and response structure.

            ## Migration

            - Existing \`${this.type}\` and \`FORMATS\` books still parse and compile.
            - New books should use \`WRITING RULES\` for formatting or structure constraints and \`WRITING SAMPLE\` when a concrete example communicates the target shape better.
            - Runtime behavior is intentionally unchanged for backward compatibility.

            ## Preferred replacement

            \`\`\`book
            Data Analyst

            GOAL Present results in a clean, readable structure.
            WRITING RULES Use markdown headings for sections and bullet points for lists.
            WRITING RULES Keep tables narrow and readable.
            WRITING SAMPLE
            Summary
            - ...
            Details
            - ...
            Next steps
            - ...
            \`\`\`

            ## Legacy compatibility example

            \`\`\`book
            Data Analyst

            GOAL Present results in a clean structure.
            FORMAT Present results in structured tables
            FORMAT Include confidence scores for all predictions
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

// Note: [💞] Ignore a discrepancy between file name and entity name
