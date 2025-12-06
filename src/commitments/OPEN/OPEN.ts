import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * OPEN commitment definition
 *
 * The OPEN commitment specifies that the agent can be modified by conversation.
 * This is the default behavior.
 *
 * Example usage in agent source:
 *
 * ```book
 * OPEN
 * ```
 */
export class OpenCommitmentDefinition extends BaseCommitmentDefinition<'OPEN'> {
    constructor() {
        super('OPEN');
    }

    /**
     * Short one-line description of OPEN.
     */
    get description(): string {
        return 'Allow the agent to be modified by conversation (default).';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🔓';
    }

    /**
     * Markdown documentation for OPEN commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # OPEN

            Specifies that the agent can be modified by conversation with it.
            This means the agent will learn from interactions and update its source code.
            
            This is the default behavior if neither \`OPEN\` nor \`CLOSED\` is specified.

            > See also [CLOSED](/docs/CLOSED)

            ## Example

            \`\`\`book
            OPEN
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, _content: string): AgentModelRequirements {
        // Since OPEN is default, we can just ensure isClosed is false
        // But to be explicit we can set it

        const updatedMetadata = {
            ...requirements.metadata,
            isClosed: false,
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
