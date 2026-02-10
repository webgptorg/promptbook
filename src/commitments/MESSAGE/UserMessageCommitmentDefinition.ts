import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { keepUnused } from '../../utils/organization/keepUnused';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * USER MESSAGE commitment definition
 *
 * The USER MESSAGE commitment defines a message from the user in the conversation history.
 * It is used to pre-fill the chat with a conversation history or to provide few-shot examples.
 *
 * Example usage in agent source:
 *
 * ```book
 * USER MESSAGE Hello, I have a problem.
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class UserMessageCommitmentDefinition extends BaseCommitmentDefinition<'USER MESSAGE'> {
    public constructor() {
        super('USER MESSAGE');
    }

    /**
     * Short one-line description of USER MESSAGE.
     */
    get description(): string {
        return 'Defines a **message from the user** in the conversation history.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🧑';
    }

    /**
     * Markdown documentation for USER MESSAGE commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Defines a message from the user in the conversation history. This is used to pre-fill the chat with a conversation history or to provide few-shot examples.

            ## Key aspects

            - Represents a message sent by the user.
            - Used for setting up conversation context.
            - Can be used in conjunction with AGENT MESSAGE.

            ## Examples

            \`\`\`book
            Conversation History

            USER MESSAGE Hello, I have a problem.
            AGENT MESSAGE What seems to be the issue?
            USER MESSAGE My computer is not starting.
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        // USER MESSAGE is for UI display purposes / conversation history construction
        // and typically doesn't need to be added to the system prompt or model requirements directly.
        // It is extracted separately for the chat interface.

        keepUnused(content);

        return {
            ...requirements,
            _metadata: {
                ...requirements._metadata,
                pendingUserMessage: content,
            },
        };
    }
}
