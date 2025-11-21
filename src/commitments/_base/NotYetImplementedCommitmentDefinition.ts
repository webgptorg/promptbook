import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from './BaseCommitmentDefinition';

/**
 * Placeholder commitment definition for commitments that are not yet implemented
 *
 * This commitment simply adds its content 1:1 into the system message,
 * preserving the original behavior until proper implementation is added.
 *
 * @public exported from `@promptbook/core`
 */
export class NotYetImplementedCommitmentDefinition<
    TBookCommitment extends string,
> extends BaseCommitmentDefinition<TBookCommitment> {
    constructor(type: TBookCommitment) {
        super(type);
    }

    /**
     * Short one-line description of a placeholder commitment.
     */
    get description(): string {
        return 'Placeholder commitment that appends content verbatim to the system message.';
    }

    /**
     * Markdown documentation available at runtime.
     */
    get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            This commitment is not yet fully implemented.

            ## Key aspects

            - Content is appended directly to the system message.
            - No special processing or validation is performed.
            - Behavior preserved until proper implementation is added.

            ## Status

            - **Status:** Placeholder implementation
            - **Effect:** Appends content prefixed by commitment type
            - **Future:** Will be replaced with specialized logic

            ## Examples

            \`\`\`book
            Example Agent

            PERSONA You are a helpful assistant
            ${this.type} Your content here
            RULE Always be helpful
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        // Add the commitment content 1:1 to the system message
        const commitmentLine = `${this.type} ${trimmedContent}`;

        return this.appendToSystemMessage(requirements, commitmentLine, '\n\n');
    }
}
