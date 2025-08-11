import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../_misc/AgentModelRequirements';
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
            Until it is, its content is appended 1:1 to the system message, preserving current behavior.

            - Status: Placeholder
            - Effect: Appends a line to the system message prefixed by the commitment type

            Example:
            \`\`\`book
            ${this.type} Your content here
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
