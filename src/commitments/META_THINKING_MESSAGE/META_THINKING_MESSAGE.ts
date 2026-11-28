import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * META THINKING MESSAGE commitment definition.
 *
 * The `META THINKING MESSAGE` commitment adds one custom thinking placeholder
 * variant used by chat UIs while an agent is composing a reply.
 *
 * @private Metadata-only commitment used by Agents Server chat UIs.
 */
export class MetaThinkingMessageCommitmentDefinition extends BaseCommitmentDefinition<'META THINKING MESSAGE'> {
    public constructor() {
        super('META THINKING MESSAGE');
    }

    /**
     * Short one-line description of META THINKING MESSAGE.
     */
    get description(): string {
        return 'Add a custom thinking placeholder shown while the agent replies.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '💭';
    }

    /**
     * Markdown documentation for META THINKING MESSAGE commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # META THINKING MESSAGE

            Adds one custom placeholder variant shown while the agent is composing a reply.

            ## Key aspects

            - Does not modify model behavior, system message, or tools.
            - Multiple \`META THINKING MESSAGE\` commitments define multiple variants.
            - Chat UIs randomly rotate between the configured variants while the reply is running.
            - When no non-empty variants are configured, the server-level \`THINKING_MESSAGES\` metadata is used.
            - Supports multiline markdown content.

            ## Example

            \`\`\`book
            Helpful Assistant

            META THINKING MESSAGE Thinking...
            META THINKING MESSAGE Processing...
            META THINKING MESSAGE

            Doing
            extra **hard** work
            \`\`\`
        `);
    }

    public applyToAgentModelRequirements(
        requirements: AgentModelRequirements,
        content: string,
    ): AgentModelRequirements {
        TODO_USE(content);

        // META THINKING MESSAGE is metadata only and does not alter model requirements.
        return requirements;
    }
}

// Note: [💞] Ignore a discrepancy between file name and entity name
