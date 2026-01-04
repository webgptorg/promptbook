import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { Promisable } from 'type-fest';
import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { keepUnused } from '../../utils/organization/keepUnused';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * INITIAL MESSAGE commitment definition
 *
 * The INITIAL MESSAGE commitment defines the first message that the user sees when opening the chat.
 * It is used to greet the user and set the tone of the conversation.
 *
 * Example usage in agent source:
 *
 * ```book
 * INITIAL MESSAGE Hello! I am ready to help you with your tasks.
 * ```
 *
 * @private [đźŞ”] Maybe export the commitments through some package
 */
export class InitialMessageCommitmentDefinition extends BaseCommitmentDefinition<'INITIAL MESSAGE'> {
    constructor() {
        super('INITIAL MESSAGE');
    }

    /**
     * Short one-line description of INITIAL MESSAGE.
     */
    get description(): string {
        return 'Defines the **initial message** shown to the user when the chat starts.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return 'đź‘‹';
    }

    /**
     * Markdown documentation for INITIAL MESSAGE commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Defines the first message that the user sees when opening the chat. This message is purely for display purposes in the UI and does not inherently become part of the LLM's system prompt context (unless also included via other means).

            ## Key aspects

            - Used to greet the user.
            - Sets the tone of the conversation.
            - Displayed immediately when the chat interface loads.

            ## Examples

            \`\`\`book
            Support Agent

            PERSONA You are a helpful support agent.
            INITIAL MESSAGE Hi there! How can I assist you today?
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string, _tools: Pick<ExecutionTools, 'fs' | 'scrapers'>): Promisable<AgentModelRequirements> {
        // INITIAL MESSAGE is for UI display purposes and typically doesn't need to be
        // added to the system prompt or model requirements directly.
        // It is extracted separately for the chat interface.

        keepUnused(content);

        return requirements;
    }
}
