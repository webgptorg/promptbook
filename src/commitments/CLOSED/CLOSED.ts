import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { keepUnused } from '../../utils/organization/keepUnused';
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
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class ClosedCommitmentDefinition extends BaseCommitmentDefinition<'CLOSED'> {
    constructor() {
        super('CLOSED');
    }

    /**
     * The `CLOSED` commitment is standalone.
     */
    override get requiresContent(): boolean {
        return false;
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

            > See also [OPEN](/docs/OPEN)

            ## Example

            \`\`\`book
            CLOSED
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, _content: string): AgentModelRequirements {
        keepUnused(_content);

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

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
