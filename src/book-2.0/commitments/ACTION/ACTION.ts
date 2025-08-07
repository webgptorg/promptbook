import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import type { AgentModelRequirements } from '../_misc/AgentModelRequirements';

/**
 * ACTION commitment definition
 *
 * The ACTION commitment defines specific actions or capabilities that the agent can perform.
 * This helps define what the agent is capable of doing and how it should approach tasks.
 *
 * Example usage in agent source:
 * ```
 * ACTION Can generate code snippets and explain programming concepts
 * ACTION Able to analyze data and provide insights
 * ```
 */
export class ActionCommitmentDefinition extends BaseCommitmentDefinition {
    constructor() {
        super('ACTION');
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        // Add action capability to the system message
        const actionSection = `Capability: ${trimmedContent}`;

        return this.appendToSystemMessage(requirements, actionSection, '\n\n');
    }
}

/**
 * Singleton instance of the ACTION commitment definition
 */
export const ActionCommitment = new ActionCommitmentDefinition();
