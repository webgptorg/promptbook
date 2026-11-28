import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import { parseAgentSourceWithCommitments } from '../../../../../src/book-2.0/agent-source/parseAgentSourceWithCommitments';

/**
 * Resolves the effective non-empty `GOAL` or `GOALS` commitment from one agent source.
 *
 * Goal commitments overwrite each other in source order, so the last non-empty declaration is
 * the same goal that reaches the agent model requirements.
 *
 * @param agentSource - Current persisted agent source.
 * @returns Effective goal text, or `null` when no goal is defined.
 */
export function resolveEffectiveAgentGoal(agentSource: string_book): string | null {
    const commitments = parseAgentSourceWithCommitments(agentSource).commitments;

    for (let index = commitments.length - 1; index >= 0; index--) {
        const commitment = commitments[index]!;
        if (commitment.type !== 'GOAL' && commitment.type !== 'GOALS') {
            continue;
        }

        const goal = commitment.content.trim();
        if (goal) {
            return goal;
        }
    }

    return null;
}
