import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * SAMPLE commitment definition
 *
 * The SAMPLE/EXAMPLE commitment provides examples of how the agent should respond
 * or behave in certain situations. These examples help guide the agent's responses.
 *
 * Example usage in agent source:
 *
 * ```book
 * SAMPLE When asked about pricing, respond: "Our basic plan starts at $10/month..."
 * EXAMPLE For code questions, always include working code snippets
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class SampleCommitmentDefinition extends BaseCommitmentDefinition<'SAMPLE' | 'EXAMPLE'> {
    constructor(type: 'SAMPLE' | 'EXAMPLE' = 'SAMPLE') {
        super(type);
    }

    /**
     * Short one-line description of SAMPLE/EXAMPLE.
     */
    get description(): string {
        return 'Provide example responses to guide behavior.';
    }

    /**
     * Markdown documentation for SAMPLE/EXAMPLE commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Provides examples of how the agent should respond or behave in certain situations.

            ## Key behaviors

            - Multiple \`SAMPLE\` and \`EXAMPLE\` commitments are applied sequentially.
            - Both terms work identically and can be used interchangeably.
            - Examples help guide the agent's response patterns and style.

            ## Examples

            \`\`\`book
            Sales Assistant

            PERSONA You are a knowledgeable sales representative
            SAMPLE When asked about pricing, respond: "Our basic plan starts at $10/month..."
            SAMPLE For feature comparisons, create a clear comparison table
            RULE Always be honest about limitations
            \`\`\`

            \`\`\`book
            Code Reviewer

            PERSONA You are an experienced software engineer
            EXAMPLE For code questions, always include working code snippets
            EXAMPLE When suggesting improvements: "Here's a more efficient approach..."
            RULE Explain the reasoning behind your suggestions
            STYLE Be constructive and encouraging in feedback
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        // Add example to the system message
        const exampleSection = `Example: ${trimmedContent}`;

        return this.appendToSystemMessage(requirements, exampleSection, '\n\n');
    }
}

/**
 * Singleton instances of the SAMPLE commitment definitions
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export const SampleCommitment = new SampleCommitmentDefinition('SAMPLE');

/**
 * Singleton instances of the SAMPLE commitment definitions
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export const ExampleCommitment = new SampleCommitmentDefinition('EXAMPLE');

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
