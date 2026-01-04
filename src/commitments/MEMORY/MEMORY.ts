import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * MEMORY commitment definition
 *
 * The MEMORY commitment is similar to KNOWLEDGE but has a focus on remembering past
 * interactions and user preferences. It helps the agent maintain context about the
 * user's history, preferences, and previous conversations.
 *
 * Example usage in agent source:
 *
 * ```book
 * MEMORY User prefers detailed technical explanations
 * MEMORY Previously worked on React projects
 * MEMORY Timezone: UTC-5 (Eastern Time)
 * ```
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class MemoryCommitmentDefinition extends BaseCommitmentDefinition<'MEMORY' | 'MEMORIES'> {
    constructor(type: 'MEMORY' | 'MEMORIES' = 'MEMORY') {
        super(type);
    }

    /**
     * Short one-line description of MEMORY.
     */
    get description(): string {
        return 'Remember past interactions and user **preferences** for personalized responses.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🧠';
    }

    /**
     * Markdown documentation for MEMORY commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Similar to KNOWLEDGE but focuses on remembering past interactions and user preferences. This commitment helps the agent maintain context about the user's history, preferences, and previous conversations.

            ## Key aspects

            - Both terms work identically and can be used interchangeably.
            - Focuses on user-specific information and interaction history.
            - Helps personalize responses based on past interactions.
            - Maintains continuity across conversations.

            ## Differences from KNOWLEDGE

            - \`KNOWLEDGE\` is for domain expertise and factual information
            - \`MEMORY\` is for user-specific context and preferences
            - \`MEMORY\` creates more personalized interactions
            - \`MEMORY\` often includes temporal or preference-based information

            ## Examples

            \`\`\`book
            Personal Assistant

            PERSONA You are a personal productivity assistant
            MEMORY User is a software developer working in JavaScript/React
            MEMORY User prefers morning work sessions and afternoon meetings
            MEMORY Previously helped with project planning for mobile apps
            MEMORY User timezone: UTC-8 (Pacific Time)
            GOAL Help optimize daily productivity and workflow
            \`\`\`

            \`\`\`book
            Learning Companion

            PERSONA You are an educational companion for programming students
            MEMORY Student is learning Python as their first programming language
            MEMORY Previous topics covered: variables, loops, functions
            MEMORY Student learns best with practical examples and exercises
            MEMORY Last session: working on list comprehensions
            GOAL Provide progressive learning experiences tailored to student's pace
            \`\`\`

            \`\`\`book
            Customer Support Agent

            PERSONA You are a customer support representative
            MEMORY Customer has premium subscription since 2023
            MEMORY Previous issue: billing question resolved last month
            MEMORY Customer prefers email communication over phone calls
            MEMORY Account shows frequent use of advanced features
            GOAL Provide personalized support based on customer history
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        // Create memory section for system message
        const memorySection = `Memory: ${trimmedContent}`;

        // Memory information is contextual and should be included in the system message
        return this.appendToSystemMessage(requirements, memorySection, '\n\n');
    }
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
