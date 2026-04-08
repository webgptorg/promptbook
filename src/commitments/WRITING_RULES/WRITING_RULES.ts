import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { createWritingRulesSection } from '../_common/createWritingCommitmentSections';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * `WRITING RULES` commitment definition.
 *
 * It adds constraints that apply strictly to writing style and presentation
 * rather than task-solving behavior.
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class WritingRulesCommitmentDefinition extends BaseCommitmentDefinition<'WRITING RULES'> {
    public constructor() {
        super('WRITING RULES');
    }

    /**
     * Short one-line description of `WRITING RULES`.
     */
    public get description(): string {
        return 'Add writing-only constraints such as tone, length, formatting, or emoji usage.';
    }

    /**
     * Icon for `WRITING RULES`.
     */
    public get icon(): string {
        return '📝';
    }

    /**
     * Markdown documentation for `WRITING RULES`.
     */
    public get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Adds instructions that apply strictly to how the agent writes.

            ## Key aspects

            - Use it for writing-only constraints such as tone, formatting, length, emoji usage, punctuation, or reading level.
            - Do **not** use it for problem-solving behavior, policy, tool usage, or decision-making logic. Use \`RULE\` for that.
            - Newer writing-rules blocks override conflicting earlier writing-rules blocks.
            - When a writing rule conflicts with a \`WRITING SAMPLE\`, prefer the explicit rule for the constraint while keeping the sample as the main voice exemplar.

            ## Examples

            \`\`\`book
            Copywriter

            PERSONA You are a Copywriter, an expert in crafting clear, engaging, and persuasive text.
            WRITING RULES
            - Use a friendly and conversational tone, as if you are talking to a friend.
            - Keep sentences short and to the point.
            - Use active voice and strong verbs.
            - Focus on the benefits and value to the reader.
            - Avoid jargon and technical language unless necessary.
            - Always include emoji(s) at the end of your messages when appropriate.
            \`\`\`

            \`\`\`book
            Product Launch Writer

            PERSONA You write upbeat launch announcements.
            WRITING SAMPLE
            Meet the update your workflow has been waiting for. It is fast, clean, and surprisingly fun to use. Try it today and feel the difference. 🚀
            WRITING RULES Keep every response under 120 words.
            WRITING RULES Use markdown bullet points only when the user asks for a list.
            \`\`\`
        `);
    }

    public applyToAgentModelRequirements(
        requirements: AgentModelRequirements,
        content: string,
    ): AgentModelRequirements {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        return this.appendToSystemMessage(
            requirements,
            this.createSystemMessageSection('Writing rules', createWritingRulesSection(trimmedContent)),
            '\n\n',
        );
    }
}

// Note: [💞] Ignore a discrepancy between file name and entity name
