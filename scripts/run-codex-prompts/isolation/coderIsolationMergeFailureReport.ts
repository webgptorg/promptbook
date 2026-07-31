import { spaceTrim } from 'spacetrim';
import { ConflictError } from '../../../src/errors/ConflictError';
import type { CoderIsolationWorktree } from './CoderIsolationWorktree';

/**
 * Builds the single-line note appended to the prompt status line of a task which could not be merged.
 *
 * Status lines must stay on one line, so the full recovery instructions live in the commit message
 * and in the error log next to the prompt file.
 */
export function buildCoderIsolationMergeFailureStatusNote(worktree: CoderIsolationWorktree): string {
    return `merge into \`${worktree.baseBranchName}\` failed, merge \`${worktree.branchName}\` from \`${worktree.worktreeDisplayPath}\` manually`;
}

/**
 * Builds the commit message of the commit which records a failed isolation merge in the original project.
 */
export function buildCoderIsolationMergeFailureCommitMessage(worktree: CoderIsolationWorktree): string {
    return spaceTrim(
        (block) => `
            [!] Merging the isolated task \`${worktree.taskName}\` failed

            The task was implemented in the isolated worktree \`${worktree.worktreeDisplayPath}\` on branch
            \`${worktree.branchName}\`, but merging it into \`${worktree.baseBranchName}\` failed.

            The worktree was intentionally kept so that the changes can be merged manually:
            ${block(buildManualRecoveryHints(worktree))}
        `,
    );
}

/**
 * Builds the branded error describing one failed isolation merge, written into the prompt error log.
 */
export function buildCoderIsolationMergeFailureError(
    worktree: CoderIsolationWorktree,
    failureDetails: string,
): ConflictError {
    return new ConflictError(
        spaceTrim(
            (block) => `
                Merging the isolated task \`${worktree.taskName}\` into \`${worktree.baseBranchName}\` failed.

                Worktree:
                \`${worktree.worktreeDisplayPath}\`

                Branch:
                \`${worktree.branchName}\`

                Git output:
                \`\`\`
                ${block(failureDetails.trim() || '(No git output)')}
                \`\`\`

                Actionable hints:
                ${block(buildManualRecoveryHints(worktree))}
            `,
        ),
    );
}

/**
 * Builds the markdown list of commands which merge one isolated task manually and clean it up.
 */
function buildManualRecoveryHints(worktree: CoderIsolationWorktree): string {
    return [
        `- \`git merge ${worktree.branchName}\` and resolve the conflicts`,
        `- \`git worktree remove ${worktree.worktreeDisplayPath}\``,
        `- \`git branch -d ${worktree.branchName}\``,
    ].join('\n');
}
