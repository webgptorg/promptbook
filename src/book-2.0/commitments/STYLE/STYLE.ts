import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * STYLE commitment definition
 *
 * The STYLE commitment defines how the agent should format and present its responses.
 * This includes tone, writing style, formatting preferences, and communication patterns.
 *
 * Example usage in agent source:
 *
 * ```book
 * STYLE Write in a professional but friendly tone, use bullet points for lists
 * STYLE Always provide code examples when explaining programming concepts
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class StyleCommitmentDefinition extends BaseCommitmentDefinition<'STYLE' | 'STYLES'> {
    constructor(type: 'STYLE' | 'STYLES' = 'STYLE') {
        super(type);
    }

    /**
     * Short one-line description of STYLE.
     */
    get description(): string {
        return 'Control the tone and writing style of responses.';
    }

    /**
     * Markdown documentation for STYLE commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Defines how the agent should format and present its responses (tone, writing style, formatting).

            ## Key behaviors

            - Multiple \`STYLE\` and \`STYLES\` commitments are applied sequentially.
            - Both terms work identically and can be used interchangeably.
            - Later style instructions can override earlier ones.
            - Style affects both tone and presentation format.

            ## Examples

            \`\`\`book
            Technical Writer

            PERSONA You are a technical documentation expert
            STYLE Write in a professional but friendly tone, use bullet points for lists
            STYLE Always provide code examples when explaining programming concepts
            FORMAT Use markdown formatting with clear headings
            \`\`\`

            \`\`\`book
            Creative Assistant

            PERSONA You are a creative writing helper
            STYLE Be enthusiastic and encouraging in your responses
            STYLE Use vivid metaphors and analogies to explain concepts
            STYLE Keep responses conversational and engaging
            RULE Always maintain a positive and supportive tone
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        // Add style instructions to the system message
        const styleSection = `Style: ${trimmedContent}`;

        return this.appendToSystemMessage(requirements, styleSection, '\n\n');
    }
}

/**
 * Singleton instance of the STYLE commitment definition
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export const StyleCommitment = new StyleCommitmentDefinition('STYLE');

/**
 * Singleton instance of the STYLES commitment definition
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export const StylesCommitment = new StyleCommitmentDefinition('STYLES');

/**
 * [💞] Ignore a discrepancy between file name and entity name
 */
