import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import type { AgentModelRequirements } from '../_misc/AgentModelRequirements';

/**
 * RULE commitment definition
 *
 * The RULE/RULES commitment adds behavioral constraints and guidelines that the agent must follow.
 * These are specific instructions about what the agent should or shouldn't do.
 *
 * Example usage in agent source:
 * ```
 * RULE Always ask for clarification if the user's request is ambiguous
 * RULES Never provide medical advice, always refer to healthcare professionals
 * ```
 */
export class RuleCommitmentDefinition extends BaseCommitmentDefinition {
    constructor(type: 'RULE' | 'RULES' = 'RULE') {
        super(type);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        // Add rule to the system message
        const ruleSection = `Rule: ${trimmedContent}`;

        return this.appendToSystemMessage(requirements, ruleSection, '\n\n');
    }
}

/**
 * Singleton instances of the RULE commitment definitions
 */
export const RuleCommitment = new RuleCommitmentDefinition('RULE');
export const RulesCommitment = new RuleCommitmentDefinition('RULES');
