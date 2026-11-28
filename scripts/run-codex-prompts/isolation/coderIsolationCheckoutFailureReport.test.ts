import { buildCoderIsolationCheckoutFailureError } from './coderIsolationCheckoutFailureReport';
import type { CoderIsolationWorktree } from './CoderIsolationWorktree';

/**
 * The worktree every checkout failure report is built for.
 */
const WORKTREE: CoderIsolationWorktree = {
    taskName: '2026-07-0972-agents-server-self-contained-email-server',
    projectPath: 'C:\\project',
    worktreePath:
        'C:\\project/.promptbook/coder-isolation-worktrees/2026-07-0972-agents-server-self-contained-email-server',
    worktreeDisplayPath: '.promptbook/coder-isolation-worktrees/2026-07-0972-agents-server-self-contained-email-server',
    branchName: 'ptbk-coder-isolation/2026-07-0972-agents-server-self-contained-email-server',
    baseBranchName: 'main',
};

/**
 * Raw git output of a checkout which ran out of the Windows `MAX_PATH` limit.
 */
const FILENAME_TOO_LONG_GIT_OUTPUT = [
    "Preparing worktree (new branch 'ptbk-coder-isolation/2026-07-0972-agents-server-self-contained-email-server')",
    'Updating files:   5% (449/8972)',
    'Updating files:   6% (539/8972)',
    'error: unable to create file apps/agents-server/src/utils/speech-to-text/example.ts: Filename too long',
    'Updating files: 100% (8972/8972), done.',
    "fatal: Could not reset index file to revision 'HEAD'.",
].join('\n');

describe('buildCoderIsolationCheckoutFailureError', () => {
    it('replaces the checkout progress noise with the lines explaining the failure', () => {
        const error = buildCoderIsolationCheckoutFailureError(WORKTREE, FILENAME_TOO_LONG_GIT_OUTPUT);

        expect(error.message).toContain(
            'error: unable to create file apps/agents-server/src/utils/speech-to-text/example.ts: Filename too long',
        );
        expect(error.message).toContain("fatal: Could not reset index file to revision 'HEAD'.");
        expect(error.message).not.toContain('Updating files');
    });

    it('is a branded error naming the task and its worktree', () => {
        const error = buildCoderIsolationCheckoutFailureError(WORKTREE, FILENAME_TOO_LONG_GIT_OUTPUT);

        expect(error.name).toBe('EnvironmentMismatchError');
        expect(error.message).toContain(`\`${WORKTREE.taskName}\``);
        expect(error.message).toContain(`\`${WORKTREE.worktreeDisplayPath}\``);
        expect(error.message).toContain(`\`${WORKTREE.branchName}\``);
    });

    it('hints at the Windows path limit only when git ran into it', () => {
        const longPathError = buildCoderIsolationCheckoutFailureError(WORKTREE, FILENAME_TOO_LONG_GIT_OUTPUT);
        const otherError = buildCoderIsolationCheckoutFailureError(
            WORKTREE,
            'fatal: not a git repository (or any of the parent directories): .git',
        );

        expect(longPathError.message).toContain('`MAX_PATH`');
        expect(otherError.message).not.toContain('`MAX_PATH`');
        expect(otherError.message).toContain('fatal: not a git repository');
    });

    it('keeps git output which has no recognizable failure line', () => {
        const error = buildCoderIsolationCheckoutFailureError(WORKTREE, 'Something went wrong');

        expect(error.message).toContain('Something went wrong');
    });
});
