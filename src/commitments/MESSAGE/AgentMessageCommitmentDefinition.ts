import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { keepUnused } from '../../utils/organization/keepUnused';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * AGENT MESSAGE commitment definition
 *
 * The AGENT MESSAGE commitment defines a message from the agent in the conversation history.
 * It is used to pre-fill the chat with a conversation history or to provide few-shot examples.
 *
 * Example usage in agent source:
 *
 * ```book
 * AGENT MESSAGE What seems to be the issue?
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class AgentMessageCommitmentDefinition extends BaseCommitmentDefinition<'AGENT MESSAGE'> {
    public constructor() {
        super('AGENT MESSAGE');
    }

    /**
     * Short one-line description of AGENT MESSAGE.
     */
    get description(): string {
        return 'Defines a **message from the agent** in the conversation history.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🤖';
    }

    /**
     * Markdown documentation for AGENT MESSAGE commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Defines a message from the agent in the conversation history. This is used to pre-fill the chat with a conversation history or to provide few-shot examples.

            ## Key aspects

            - Represents a message sent by the agent.
            - Used for setting up conversation context.
            - Can be used in conjunction with USER MESSAGE.

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
        // AGENT MESSAGE is for UI display purposes / conversation history construction
        // and typically doesn't need to be added to the system prompt or model requirements directly.
        // It is extracted separately for the chat interface.

        keepUnused(content);

        const pendingUserMessage = requirements.metadata?.pendingUserMessage;

        if (pendingUserMessage) {
            const newSample = { question: pendingUserMessage, answer: content };
            const newSamples = [...(requirements.samples || []), newSample];

            const newMetadata = { ...requirements.metadata };
            delete newMetadata.pendingUserMessage;

            return {
                ...requirements,
                samples: newSamples,
                metadata: newMetadata,
            };
        }

        return requirements;
    }
}
