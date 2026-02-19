import { spaceTrim } from 'spacetrim';
import { parseAgentSourceWithCommitments } from './parseAgentSourceWithCommitments';
import type { string_book } from './string_book';

/**
 * Extracts the teacher-focused instructions from the latest `OPEN` commitment in the book.
 *
 * The `OPEN` commitment may include extra text that should guide the teacher agent when
 * self-learning. We keep the last non-empty `OPEN` value so later overrides win.
 *
 * @param agentSource - The raw agent book source
 * @returns The trimmed instructions or `null` when no instructive `OPEN` commitment exists.
 * @private Internal helper shared between self-learning and related features.
 */
export function extractOpenTeacherInstructions(agentSource: string_book): string | null {
    const { commitments } = parseAgentSourceWithCommitments(agentSource);

    for (let i = commitments.length - 1; i >= 0; i -= 1) {
        const commitment = commitments[i]!;
        if (commitment.type !== 'OPEN') {
            continue;
        }

        const trimmed = spaceTrim(commitment.content);
        return trimmed || null;
    }

    return null;
}
