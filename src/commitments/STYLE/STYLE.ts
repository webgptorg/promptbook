import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * STYLE commitment definition
 *
 * Deprecated legacy writing-style commitment kept for backward compatibility.
 * New books should prefer `WRITING RULES` for writing-only constraints.
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
    public constructor(type: 'STYLE' | 'STYLES' = 'STYLE') {
        super(type);
    }

    /**
     * Short one-line description of STYLE.
     */
    get description(): string {
        return 'Deprecated legacy writing-style commitment. Prefer `WRITING RULES` for new books.';
    }

    /**
     * Optional UI/docs-only deprecation metadata.
     */
    public override get deprecation() {
        return {
            message:
                'Use `WRITING RULES` for writing-only constraints such as tone, length, formatting, or emoji usage.',
            replacedBy: ['WRITING RULES'],
        } as const;
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🖋️';
    }

    /**
     * Markdown documentation for STYLE commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Deprecated legacy commitment for writing and presentation instructions.

            ## Migration

            - Existing \`${this.type}\` books still parse and compile.
            - New books should prefer \`WRITING RULES\`.
            - Use \`WRITING SAMPLE\` when you want to anchor voice by example instead of stating constraints directly.
            - The plural alias \`STYLES\` is the same legacy commitment family.

            ## Key aspects

            - \`${this.type}\` remains functional for backward compatibility only.
            - Later style instructions can override earlier ones.
            - Style affects both tone and presentation format.

            ## Preferred replacement

            \`\`\`book
            Technical Writer

            GOAL Help the user understand technical topics with practical, accurate guidance.
            WRITING RULES Write in a professional but friendly tone.
            WRITING RULES Use bullet points for lists.
            WRITING RULES Always provide code examples when explaining programming concepts.
            FORMAT Use markdown formatting with clear headings
            \`\`\`

            ## Legacy compatibility examples

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
 * [💞] Ignore a discrepancy between file name and entity name
 */
