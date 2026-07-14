import { computeAgentHash } from '@promptbook-local/core';
import type { string_book } from '@promptbook-local/types';
import { spaceTrim } from '@promptbook-local/utils';
import { parseAgentSourceWithCommitments } from '../../../../../src/book-2.0/agent-source/parseAgentSourceWithCommitments';

/**
 * Stable prefix for goal-owned chats.
 *
 * @private internal constant of agentGoalScheduler
 */
export const AGENT_GOAL_CHAT_ID_PREFIX = 'agent-goal';

/**
 * Human-readable title assigned to the chat used for autonomous goal work.
 *
 * @private internal constant of agentGoalScheduler
 */
export const AGENT_GOAL_CHAT_TITLE = 'Agent goals';

/**
 * Stable prefix for source-hash-scoped goal wake-up client message ids.
 *
 * @private internal constant of agentGoalScheduler
 */
export const AGENT_GOAL_CLIENT_MESSAGE_ID_PREFIX = 'agent-goal';

/**
 * Reasons that can enqueue an agent-owned goal review turn.
 *
 * @private type of agentGoalScheduler
 */
export type AgentGoalAwakeningTriggerReason = 'AGENT_CREATED' | 'AGENT_SOURCE_UPDATED';

/**
 * Resolves the last non-empty GOAL/GOALS commitment from an agent source.
 *
 * @param agentSource - Agent book source.
 * @returns Effective goal text, or `null` when the agent has no goal.
 *
 * @private internal utility of agentGoalScheduler
 */
export function resolveEffectiveGoalFromAgentSource(agentSource: string_book): string | null {
    const goalCommitments = parseAgentSourceWithCommitments(agentSource).commitments.filter(
        (commitment) => commitment.type === 'GOAL' || commitment.type === 'GOALS',
    );

    for (const commitment of [...goalCommitments].reverse()) {
        const trimmedGoal = commitment.content.trim();

        if (trimmedGoal) {
            return trimmedGoal;
        }
    }

    return null;
}

/**
 * Detects whether timeout behavior is explicitly requested outside GOAL-driven scheduling.
 *
 * @param agentSource - Agent book source.
 * @returns `true` when the source contains `USE TIMEOUT`.
 *
 * @private internal utility of agentGoalScheduler
 */
export function hasExplicitUseTimeoutCommitment(agentSource: string_book): boolean {
    return parseAgentSourceWithCommitments(agentSource).commitments.some(
        (commitment) => commitment.type === 'USE TIMEOUT',
    );
}

/**
 * Creates the stable chat id used for autonomous goal turns.
 *
 * @param options - Owner and agent identifiers.
 * @returns Stable user+agent-scoped chat id.
 *
 * @private internal utility of agentGoalScheduler
 */
export function createAgentGoalChatId(options: { userId: number; agentPermanentId: string }): string {
    return `${AGENT_GOAL_CHAT_ID_PREFIX}:${options.userId}:${options.agentPermanentId}`;
}

/**
 * Creates the source fingerprint used in goal wake-up deduplication.
 *
 * @param agentSource - Agent book source.
 * @returns Deterministic agent source hash.
 *
 * @private internal utility of agentGoalScheduler
 */
export function createAgentGoalSourceHash(agentSource: string_book): string {
    return computeAgentHash(agentSource);
}

/**
 * Creates a deterministic client message id for one goal review turn.
 *
 * @param options - Trigger reason and source fingerprint.
 * @returns Chat-job deduplication key.
 *
 * @private internal utility of agentGoalScheduler
 */
export function createAgentGoalAwakeningClientMessageId(options: {
    triggerReason: AgentGoalAwakeningTriggerReason;
    agentSourceHash: string;
}): string {
    return `${AGENT_GOAL_CLIENT_MESSAGE_ID_PREFIX}:${options.triggerReason}:${options.agentSourceHash}`;
}

/**
 * Creates the user-like message that wakes the agent to review its goal and schedule.
 *
 * @param options - Goal content and idempotency context.
 * @returns Message content appended into the goal-owned chat.
 *
 * @private internal utility of agentGoalScheduler
 */
export function createAgentGoalAwakeningMessage(options: {
    goal: string;
    triggerReason: AgentGoalAwakeningTriggerReason;
    agentSourceHash: string;
}): string {
    return spaceTrim(
        (block) => `
            Agent goal wake-up

            Trigger: \`${options.triggerReason}\`
            Source fingerprint: \`${options.agentSourceHash}\`

            Goal:
            ${block(options.goal)}

            Review this goal and the current timeout schedule. Use \`list_timeouts\` before creating or changing recurring wake-ups, use \`set_timeout\` with \`recurrenceIntervalMs\` when autonomous repeated work is useful, and avoid duplicate active schedules. If useful, work on the goal in this turn before finishing.
        `,
    );
}
