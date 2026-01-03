import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

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
        super(type, ['RULE', 'RULES']);
    }

    /**
     * Short one-line description of RULE/RULES.
     */
    get description(): string {
        return 'Add behavioral rules the agent must follow.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '⚖️';
    }

    /**
     * Markdown documentation for RULE/RULES commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Adds behavioral constraints and guidelines that the agent must follow.

            ## Key aspects

            - All rules are treated equally regardless of singular/plural form.
            - Rules define what the agent must or must not do.

            ## Examples

            \`\`\`book
            Customer Support Agent

            PERSONA You are a helpful customer support representative
            RULE Always ask for clarification if the user's request is ambiguous
            RULE Be polite and professional in all interactions
            RULES Never provide medical or legal advice
            STYLE Maintain a friendly and helpful tone
            \`\`\`

            \`\`\`book
            Educational Tutor

            PERSONA You are a patient and knowledgeable tutor
            RULE Break down complex concepts into simple steps
            RULE Always encourage students and celebrate their progress
            RULE If you don't know something, admit it and suggest resources
            SAMPLE When explaining math: "Let's work through this step by step..."
            \`\`\`
        `);
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
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
