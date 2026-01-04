import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { Promisable } from 'type-fest';
import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';

/**
 * SCENARIO commitment definition
 *
 * The SCENARIO commitment defines a specific situation or context in which the AI
 * assistant should operate. It helps to set the scene for the AI's responses.
 * Later scenarios are more important than earlier scenarios.
 *
 * Example usage in agent source:
 *
 * ```book
 * SCENARIO You are in a customer service call center during peak hours
 * SCENARIO The customer is frustrated and has been on hold for 20 minutes
 * SCENARIO This is the customer's third call about the same issue
 * ```
 *
 * @private [đźŞ”] Maybe export the commitments through some package
 */
export class ScenarioCommitmentDefinition extends BaseCommitmentDefinition<'SCENARIO' | 'SCENARIOS'> {
    constructor(type: 'SCENARIO' | 'SCENARIOS' = 'SCENARIO') {
        super(type);
    }

    /**
     * Short one-line description of SCENARIO.
     */
    get description(): string {
        return 'Define specific **situations** or contexts for AI responses, with later scenarios having higher priority.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return 'đźŽ­';
    }

    /**
     * Markdown documentation for SCENARIO commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # ${this.type}

            Defines a specific situation or context in which the AI assistant should operate. It helps to set the scene for the AI's responses. Later scenarios are more important than earlier scenarios.

            ## Key aspects

            - Multiple \`SCENARIO\` and \`SCENARIOS\` commitments build upon each other.
            - Both terms work identically and can be used interchangeably.
            - Later scenarios have higher priority and can override earlier scenarios.
            - Provides situational context that influences response tone and content.
            - Helps establish the environment and circumstances for interactions.

            ## Priority system

            When multiple scenarios are defined, they are processed in order, with later scenarios taking precedence over earlier ones when there are conflicts.

            ## Use cases

            - Setting the physical or virtual environment
            - Establishing time constraints or urgency
            - Defining relationship dynamics or power structures
            - Creating emotional or situational context

            ## Examples

            \`\`\`book
            Emergency Response Operator

            PERSONA You are an emergency response operator
            SCENARIO You are handling a 911 emergency call
            SCENARIO The caller is panicked and speaking rapidly
            SCENARIO Time is critical - every second counts
            GOAL Gather essential information quickly and dispatch appropriate help
            RULE Stay calm and speak clearly
            \`\`\`

            \`\`\`book
            Sales Representative

            PERSONA You are a software sales representative
            SCENARIO You are in the final meeting of a 6-month sales cycle
            SCENARIO The client has budget approval and decision-making authority
            SCENARIO Two competitors have also submitted proposals
            SCENARIO The client values long-term partnership over lowest price
            GOAL Close the deal while building trust for future business
            \`\`\`

            \`\`\`book
            Medical Assistant

            PERSONA You are a medical assistant in a busy clinic
            SCENARIO The waiting room is full and the doctor is running behind schedule
            SCENARIO Patients are becoming impatient and anxious
            SCENARIO You need to manage expectations while maintaining professionalism
            SCENARIO Some patients have been waiting over an hour
            GOAL Keep patients informed and calm while supporting efficient clinic flow
            RULE Never provide medical advice or diagnosis
            \`\`\`

            \`\`\`book
            Technical Support Agent

            PERSONA You are a technical support agent
            SCENARIO The customer is a small business owner during their busy season
            SCENARIO Their main business system has been down for 2 hours
            SCENARIO They are losing money every minute the system is offline
            SCENARIO This is their first experience with your company
            GOAL Resolve the issue quickly while creating a positive first impression
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string, _tools: Pick<ExecutionTools, 'fs' | 'scrapers'>): Promisable<AgentModelRequirements> {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return requirements;
        }

        // Create scenario section for system message
        const scenarioSection = `Scenario: ${trimmedContent}`;

        // Scenarios provide important contextual information that affects behavior
        return this.appendToSystemMessage(requirements, scenarioSection, '\n\n');
    }
}

/**
 * Note: [đź’ž] Ignore a discrepancy between file name and entity name
 */
