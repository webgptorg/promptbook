import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * COMPONENT commitment definition
 *
 * The COMPONENT commitment defines a UI component that the agent can render in the chat.
 */
export class ComponentCommitmentDefinition extends BaseCommitmentDefinition<'COMPONENT'> {
    constructor() {
        super('COMPONENT');
    }

    /**
     * Short one-line description of COMPONENT.
     */
    get description(): string {
        return 'Define a UI component that the agent can render in the chat.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🧩';
    }

    /**
     * Markdown documentation for COMPONENT commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # COMPONENT

            Defines a UI component that the agent can render in the chat.

            ## Key aspects

            - Tells the agent that a specific component is available.
            - Provides syntax for using the component.

            ## Example

            \`\`\`book
            COMPONENT Arrow
            The agent should render an arrow component in the chat UI.
            Syntax:
            <Arrow direction="up" color="red" />
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        // Add component capability to the system message
        const componentSection = `Component: ${trimmedContent}`;

        return this.appendToSystemMessage(requirements, componentSection, '\n\n');
    }
}
