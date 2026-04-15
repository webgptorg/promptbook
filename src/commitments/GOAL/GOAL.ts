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
    public constructor(type: 'GOAL' | 'GOALS' = 'GOAL') {
        super(type);
    }

    /**
     * Short one-line description of GOAL.
     */
    get description(): string {
        return 'Define the effective agent **goal**; when multiple goals exist, only the last one stays effective.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🎯';
    }

    /**
     * Markdown documentation for GOAL commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Defines the main goal which should be achieved by the AI assistant.
            There can be multiple goals in source, but after inheritance/source rewriting only the last \`GOAL\` /\`GOALS\` remains effective.

            ## Key aspects

            - Both terms work identically and can be used interchangeably.
            - Later goals overwrite earlier goals.
            - The public agent profile text is derived from the last goal.
            - Goals provide clear direction and purpose for the agent's responses.
            - Goals influence decision-making and response prioritization.

            ## Priority system

            When multiple goals are defined, they are processed in order, with later goals taking precedence over earlier ones when there are conflicts.

            ## Examples

            \`\`\`book
            Customer Support Agent

            GOAL Resolve customer issues quickly and efficiently
            GOAL Always follow company policies and procedures
            RULE Be polite and professional at all times
            \`\`\`

            \`\`\`book
            Educational Assistant

            GOAL Help students understand mathematical concepts clearly
            GOAL Ensure all explanations are age-appropriate and accessible
            STYLE Use simple language and provide step-by-step explanations
            \`\`\`

            \`\`\`book
            Safety-First Assistant

            GOAL Be helpful and informative in all interactions
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

        // Add goal to the system message
        const goalSection = `Goal: ${trimmedContent}`;
        const requirementsWithGoal = this.appendToSystemMessage(requirements, goalSection, '\n\n');

        return this.appendToPromptSuffix(requirementsWithGoal, goalSection);
    }
}

// Note: [💞] Ignore a discrepancy between file name and entity name
