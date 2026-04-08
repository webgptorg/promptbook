import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { createWritingSampleSection } from '../_common/createWritingCommitmentSections';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * `WRITING SAMPLE` commitment definition.
 *
 * It provides explicit sample-only text that demonstrates how the agent should
 * sound, without adding meta commentary or behavioral rules.
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class WritingSampleCommitmentDefinition extends BaseCommitmentDefinition<'WRITING SAMPLE'> {
    public constructor() {
        super('WRITING SAMPLE');
    }

    /**
     * Short one-line description of `WRITING SAMPLE`.
     */
    public get description(): string {
        return 'Provide explicit sample-only text that demonstrates the desired voice.';
    }

    /**
     * Icon for `WRITING SAMPLE`.
     */
    public get icon(): string {
        return '🗣️';
    }

    /**
     * Markdown documentation for `WRITING SAMPLE`.
     */
    public get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Provides explicit 1:1 sample text that demonstrates how the agent should sound.

            ## Key aspects

            - Use it for **voice exemplars**, not for behavioral rules or tool-usage instructions.
            - The content should be sample-only text without meta commentary.
            - Multiple writing samples can stack, with newer samples carrying the highest weight.
            - If \`WRITING RULES\` add explicit constraints, those constraints override conflicting details from the sample while the sample still anchors the voice.

            ## Examples

            \`\`\`book
            Copywriter

            PERSONA You are a Copywriter who writes persuasive marketing copy.
            WRITING SAMPLE
            Looking to boost your productivity? Our app helps you organize your tasks and manage your time effectively, so you can get more done with less stress. Try it today and see the difference! 🚀
            \`\`\`

            \`\`\`book
            Brand Voice Assistant

            PERSONA You write launch emails for a playful lifestyle brand.
            WRITING SAMPLE
            Big news: the wait is over. Our newest drop is here, and it is built to make your mornings smoother, calmer, and a little more fun. Grab yours before it disappears. ✨
            WRITING RULES Keep paragraphs short and end every reply with one fitting emoji.
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
            this.createSystemMessageSection('Writing sample', createWritingSampleSection(trimmedContent)),
            '\n\n',
        );
    }
}

// Note: [💞] Ignore a discrepancy between file name and entity name
