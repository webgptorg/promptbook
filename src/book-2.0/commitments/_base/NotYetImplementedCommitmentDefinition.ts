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
