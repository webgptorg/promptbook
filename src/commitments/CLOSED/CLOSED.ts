import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * CLOSED commitment definition
 *
 * The CLOSED commitment specifies that the agent CANNOT be modified by conversation.
 * It prevents the agent from learning from interactions and updating its source code.
 *
 * Example usage in agent source:
 *
 * ```book
 * CLOSED
 * ```
 */
export class ClosedCommitmentDefinition extends BaseCommitmentDefinition<'CLOSED'> {
    constructor() {
        super('CLOSED');
    }

    /**
     * Short one-line description of CLOSED.
     */
    get description(): string {
        return 'Prevent the agent from being modified by conversation.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🔒';
    }

    /**
     * Markdown documentation for CLOSED commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # CLOSED

            Specifies that the agent **cannot** be modified by conversation with it.
            This means the agent will **not** learn from interactions and its source code will remain static during conversation.

            By default (if not specified), agents are \`OPEN\` to modification.

            ## Example

            \`\`\`book
            CLOSED
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const updatedMetadata = {
            ...requirements.metadata,
            isClosed: true,
        };

        return {
            ...requirements,
            metadata: updatedMetadata,
        };
    }
}
