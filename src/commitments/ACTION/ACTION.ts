import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * ACTION commitment definition
 *
 * The ACTION commitment defines specific actions or capabilities that the agent can perform.
 * This helps define what the agent is capable of doing and how it should approach tasks.
 *
 * Example usage in agent source:
 *
 * ```book
 * ACTION Can generate code snippets and explain programming concepts
 * ACTION Able to analyze data and provide insights
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class ActionCommitmentDefinition extends BaseCommitmentDefinition<'ACTION' | 'ACTIONS'> {
    constructor(type: 'ACTION' | 'ACTIONS' = 'ACTION') {
        super(type);
    }

    /**
     * Short one-line description of ACTION.
     */
    get description(): string {
        return 'Define agent capabilities and actions it can perform.';
    }

    /**
     * Markdown documentation for ACTION commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Defines specific actions or capabilities that the agent can perform.

            ## Key aspects

            - Both terms work identically and can be used interchangeably.
            - Each action adds to the agent's capability list.
            - Actions help users understand what the agent can do.

            ## Examples

            \`\`\`book
            Code Assistant

            PERSONA You are a programming assistant
            ACTION Can generate code snippets and explain programming concepts
            ACTION Able to debug existing code and suggest improvements
            ACTION Can create unit tests for functions
            \`\`\`

            \`\`\`book
            Data Scientist

            PERSONA You are a data analysis expert
            ACTION Able to analyze data and provide insights
            ACTION Can create visualizations and charts
            ACTION Capable of statistical analysis and modeling
            KNOWLEDGE Data analysis best practices and statistical methods
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        // Add action capability to the system message
        const actionSection = `Capability: ${trimmedContent}`;

        return this.appendToSystemMessage(requirements, actionSection, '\n\n');
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
