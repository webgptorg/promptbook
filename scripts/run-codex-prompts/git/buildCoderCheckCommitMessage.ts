import { spaceTrim } from 'spacetrim';
import type { CoderCheckOutcome } from '../checks/CoderCheckOutcome';

/** Subject shared by pre-coding checks and every post-implementation/recheck attempt. */
export const AUTOMATIC_CHECK_CHANGES_COMMIT_MESSAGE = 'chore: Automatically commit changes made by checks';

/** Builds truthful phase/check/task metadata without promoting failed verification to a pass. */
export function buildCoderCheckCommitMessage(options: {
    readonly phase: 'pre-coding' | 'post-implementation';
    readonly command: string;
    readonly outcome: CoderCheckOutcome;
    readonly task?: string;
    readonly attempt?: number;
}): string {
    return spaceTrim(`
        ${AUTOMATIC_CHECK_CHANGES_COMMIT_MESSAGE}

        Coder-Phase: ${options.phase}
        Coder-Check-Command: ${options.command}
        Coder-Check-Outcome: ${options.outcome.kind}
        ${options.task ? `Coder-Task: ${options.task}` : ''}
        ${options.attempt ? `Coder-Attempt: ${options.attempt}` : ''}
        ${
            options.outcome.kind === 'passed'
                ? 'Task completion is persisted separately.'
                : 'Incomplete: selected checks have not passed.'
        }
    `);
}
