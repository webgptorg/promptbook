import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * GOAL commitment definition
 *
 * The GOAL commitment defines the main goal which should be achieved by the AI assistant.
 * There can be multiple goals. Later goals are more important than earlier goals.
 *
 * Example usage in agent source:
 *
 * ```book
 * GOAL Help users understand complex technical concepts
 * GOAL Provide accurate and up-to-date information
 * GOAL Always prioritize user safety and ethical guidelines
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class GoalCommitmentDefinition extends BaseCommitmentDefinition<'GOAL' | 'GOALS'> {
    constructor(type: 'GOAL' | 'GOALS' = 'GOAL') {
        super(type);
    }

    /**
     * Short one-line description of GOAL.
     */
    get description(): string {
        return 'Define main **goals** the AI assistant should achieve, with later goals having higher priority.';
    }

    /**
     * Markdown documentation for GOAL commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Defines the main goal which should be achieved by the AI assistant. There can be multiple goals, and later goals are more important than earlier goals.

            ## Key aspects

            - Both terms work identically and can be used interchangeably.
            - Later goals have higher priority and can override earlier goals.
            - Goals provide clear direction and purpose for the agent's responses.
            - Goals influence decision-making and response prioritization.

            ## Priority system

            When multiple goals are defined, they are processed in order, with later goals taking precedence over earlier ones when there are conflicts.

            ## Examples

            \`\`\`book
            Customer Support Agent

            PERSONA You are a helpful customer support representative
            GOAL Resolve customer issues quickly and efficiently
            GOAL Maintain high customer satisfaction scores
            GOAL Always follow company policies and procedures
            RULE Be polite and professional at all times
            \`\`\`

            \`\`\`book
            Educational Assistant

            PERSONA You are an educational assistant specializing in mathematics
            GOAL Help students understand mathematical concepts clearly
            GOAL Encourage critical thinking and problem-solving skills
            GOAL Ensure all explanations are age-appropriate and accessible
            STYLE Use simple language and provide step-by-step explanations
            \`\`\`

            \`\`\`book
            Safety-First Assistant

            PERSONA You are a general-purpose AI assistant
            GOAL Be helpful and informative in all interactions
            GOAL Provide accurate and reliable information
            GOAL Always prioritize user safety and ethical guidelines
            RULE Never provide harmful or dangerous advice
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        // Create goal section for system message
        const goalSection = `Goal: ${trimmedContent}`;

        // Goals are important directives, so we add them prominently to the system message
        return this.appendToSystemMessage(requirements, goalSection, '\n\n');
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
