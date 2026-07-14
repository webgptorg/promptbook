import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import { createTimeoutTools } from '../USE_TIMEOUT/createTimeoutTools';

/**
 * Metadata flag used to add goal scheduling instructions only once.
 *
 * @private internal constant of GOAL
 */
const GOAL_SCHEDULING_METADATA_KEY = 'goalScheduling';

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
     * Marks GOAL as one of the priority commitments surfaced first in catalogues.
     */
    public override get isImportant(): boolean {
        return true;
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
            WRITING RULES Use simple language and provide step-by-step explanations
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

        const goalSection = spaceTrim(
            (block) => `
                ## Goal

                ${block(trimmedContent)}
            `,
        );
        const requirementsWithGoal = this.appendToSystemMessage(requirements, goalSection, '\n\n');
        const requirementsWithScheduling = this.addGoalSchedulingInstructions(requirementsWithGoal);

        return this.appendToPromptSuffix(requirementsWithScheduling, trimmedContent);
    }

    /**
     * Adds timeout tools and goal-owned scheduling guidance to agents that have an effective goal.
     */
    private addGoalSchedulingInstructions(requirements: AgentModelRequirements): AgentModelRequirements {
        const requirementsWithTimeoutTools: AgentModelRequirements = {
            ...requirements,
            tools: createTimeoutTools(requirements.tools || []),
        };

        if (requirementsWithTimeoutTools._metadata?.[GOAL_SCHEDULING_METADATA_KEY]) {
            return requirementsWithTimeoutTools;
        }

        return this.appendToSystemMessage(
            {
                ...requirementsWithTimeoutTools,
                _metadata: {
                    ...requirementsWithTimeoutTools._metadata,
                    [GOAL_SCHEDULING_METADATA_KEY]: true,
                },
            },
            createGoalSchedulingSystemMessage(),
            '\n\n',
        );
    }
}

/**
 * Creates scheduling instructions for agents that define a GOAL.
 *
 * @private internal utility of GOAL
 */
function createGoalSchedulingSystemMessage(): string {
    return spaceTrim(`
        ## Goal-driven scheduling

        -   When the goal requires autonomous follow-up, use \`set_timeout\` to schedule this chat to wake up later; include \`recurrenceIntervalMs\` for cron-like repeated wake-ups.
        -   Use \`list_timeouts\` and \`update_timeout\` to keep only the useful active or recurring schedule for the current goal.
        -   Use \`cancel_timeout\` when a previously scheduled wake-up is no longer useful for the current goal.
        -   When the book/source changes or a scheduled wake-up arrives, reassess the goal and adjust the next wake-up before finishing.
        -   Do not create wake-ups for agents without an effective \`GOAL\` or \`GOALS\`.
        -   Do not claim a schedule was changed unless the timeout tool confirms it.
    `);
}

// Note: [💞] Ignore a discrepancy between file name and entity name
