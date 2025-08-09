import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import type { AgentModelRequirements } from '../_misc/AgentModelRequirements';

/**
 * RULE commitment definition
 *
 * The RULE/RULES commitment adds behavioral constraints and guidelines that the agent must follow.
 * These are specific instructions about what the agent should or shouldn't do.
 *
 * Example usage in agent source:
 *
 * ```book
 * RULE Always ask for clarification if the user's request is ambiguous
 * RULES Never provide medical advice, always refer to healthcare professionals
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class RuleCommitmentDefinition extends BaseCommitmentDefinition<'RULE' | 'RULES'> {
    constructor(type: 'RULE' | 'RULES' = 'RULE') {
        super(type);
    }

    /**
     * Short one-line description of RULE/RULES.
     */
    get description(): string {
        return 'Add behavioral rules the agent must follow.';
    }

    /**
     * Markdown documentation for RULE/RULES commitment.
     */
    get documentation(): string {
        return [
            `# ${this.type}`,
            '',
            'Adds behavioral constraints and guidelines that the agent must follow.',
            '',
            'Effects on system message:',
            '- Appends a "Rule: ..." line to the system message.',
            '',
            'Examples:',
            '```book',
            "RULE Always ask for clarification if the user's request is ambiguous",
            'RULES Never provide medical advice, always refer to healthcare professionals',
            '```',
            '',
        ].join('\n');
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
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export const RuleCommitment = new RuleCommitmentDefinition('RULE');

/**
 * Singleton instances of the RULE commitment definitions
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export const RulesCommitment = new RuleCommitmentDefinition('RULES');

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
