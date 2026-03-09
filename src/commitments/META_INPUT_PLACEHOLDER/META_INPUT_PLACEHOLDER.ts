import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * META INPUT PLACEHOLDER commitment definition.
 *
 * The `META INPUT PLACEHOLDER` commitment sets the chat input placeholder text
 * that user interfaces should render for this agent.
 *
 * @private Metadata-only commitment used by chat UIs.
 */
export class MetaInputPlaceholderCommitmentDefinition extends BaseCommitmentDefinition<'META INPUT PLACEHOLDER'> {
    public constructor() {
        super('META INPUT PLACEHOLDER');
    }

    /**
     * Short one-line description of META INPUT PLACEHOLDER.
     */
    get description(): string {
        return 'Set custom placeholder text shown in the chat input.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '⌨️';
    }

    /**
     * Markdown documentation for META INPUT PLACEHOLDER commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # META INPUT PLACEHOLDER

            Sets custom placeholder text for the chat input field.

            ## Key aspects

            - Does not modify model behavior, system message, or tools.
            - If multiple \`META INPUT PLACEHOLDER\` lines are provided, the last one wins.
            - Used by chat UIs to customize the message input hint.

            ## Example

            \`\`\`book
            Helpful Assistant

            META INPUT PLACEHOLDER Ask me about your project...
            PERSONA You help users plan and ship software.
            \`\`\`
        `);
    }

    public applyToAgentModelRequirements(
        requirements: AgentModelRequirements,
        content: string,
    ): AgentModelRequirements {
        TODO_USE(content);

        // META INPUT PLACEHOLDER is metadata only and does not alter model requirements.
        return requirements;
    }

    /**
     * Convenience helper to normalize configured placeholder text.
     */
    public extractInputPlaceholder(content: string): string | null {
        const trimmedContent = content.trim();
        return trimmedContent || null;
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
