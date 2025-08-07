import type { AgentModelRequirements } from '../_misc/AgentModelRequirements';
import { BaseCommitmentDefinition } from './BaseCommitmentDefinition';
import type { BookCommitment } from './BookCommitment';

/**
 * Placeholder commitment definition for commitments that are not yet implemented
 *
 * This commitment simply adds its content 1:1 into the system message,
 * preserving the original behavior until proper implementation is added.
 */
export class NotYetImplementedCommitmentDefinition extends BaseCommitmentDefinition {
    constructor(type: BookCommitment) {
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
