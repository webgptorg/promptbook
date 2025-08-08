import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import type { AgentModelRequirements } from '../_misc/AgentModelRequirements';

/**
 * ACTION commitment definition
 *
 * The ACTION commitment defines specific actions or capabilities that the agent can perform.
 * This helps define what the agent is capable of doing and how it should approach tasks.
 *
 * Example usage in agent source:
 *
 * ```book
 * ACTION Can generate code snippets and explain programming concepts
 * ACTION Able to analyze data and provide insights
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class ActionCommitmentDefinition extends BaseCommitmentDefinition<'ACTION'> {
    constructor() {
        super('ACTION');
    }

    /**
     * Markdown documentation for ACTION commitment.
     */
    get description(): string {
        return [
            '# ACTION',
            '',
            'Defines specific actions or capabilities that the agent can perform.',
            '',
            'Effects on system message:',
            '- Appends a "Capability: ..." line to the system message.',
            '',
            'Examples:',
            '```book',
            'ACTION Can generate code snippets and explain programming concepts',
            'ACTION Able to analyze data and provide insights',
            '```',
            '',
        ].join('\n');
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
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export const ActionCommitment = new ActionCommitmentDefinition();

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
