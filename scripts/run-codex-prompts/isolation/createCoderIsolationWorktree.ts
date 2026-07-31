import colors from 'colors';
import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import { $execCommand } from '../../../src/utils/execCommand/$execCommand';
import { getPromptbookTemporaryGitignoreRule } from '../../../src/utils/filesystem/promptbookTemporaryPath';
import { formatUnknownErrorMessage } from '../common/formatUnknownErrorMessage';
import { readCurrentBranchName } from '../git/gitBranchContext';
import { $enableGitLongPathsSupport } from '../git/gitLongPathsSupport';
import { runGitCommand } from '../git/runGitCommand';
import { buildCoderIsolationCheckoutFailureError } from './coderIsolationCheckoutFailureReport';
import type { CoderIsolationWorktree } from './CoderIsolationWorktree';
import {
    buildCoderIsolationBranchName,
    buildCoderIsolationWorktreeDisplayPath,
    buildCoderIsolationWorktreePath,
} from './coderIsolationNaming';
import { copyCoderIsolationEnvironment } from './copyCoderIsolationEnvironment';
import { removeCoderIsolationWorktree } from './removeCoderIsolationWorktree';

/**
 * Branch name reported by git when no branch is checked out.
 */
const DETACHED_HEAD_BRANCH_NAME = 'HEAD';

/**
 * Options for creating one isolation worktree.
 */
type CreateCoderIsolationWorktreeOptions = {
    /**
     * Absolute path of the project the coder was started from.
     */
    readonly projectPath: string;

    /**
     * Name of the isolated task, for example `2026-07-0700-ptbk-coder-timing`.
     */
    readonly taskName: string;
};

/**
 * Creates one temporary git worktree with its own branch and its own copy of the project environment.
 *
 * Leftovers of an earlier run of the same task are removed first so that a repeated task never fails
 * on an already existing worktree directory or branch.
 */
export async function createCoderIsolationWorktree(
    options: CreateCoderIsolationWorktreeOptions,
): Promise<CoderIsolationWorktree> {
    const { projectPath, taskName } = options;

    // Note: The worktree nests the whole repository below `.promptbook/coder-isolation-worktrees/<task-name>`,
    //       so paths which still fit into the Windows `MAX_PATH` limit inside the project no longer fit inside
    //       the worktree and git needs long path support to check them out, read them and delete them again
    $enableGitLongPathsSupport();

    const baseBranchName = await readCurrentBranchName(projectPath);

    if (baseBranchName === DETACHED_HEAD_BRANCH_NAME) {
        throw new NotAllowed(
            spaceTrim(`
                Flag \`--isolate\` cannot be used while git is in **detached HEAD** state.

                Isolated tasks are merged back into the branch the coder runs on, so a named branch is required.

                Actionable hint:
                - Check out a branch (for example \`git checkout main\`) and rerun \`ptbk coder run --isolate\`.
            `),
        );
    }

    const worktree: CoderIsolationWorktree = {
        taskName,
        projectPath,
        worktreePath: buildCoderIsolationWorktreePath(projectPath, taskName),
        worktreeDisplayPath: buildCoderIsolationWorktreeDisplayPath(taskName),
        branchName: buildCoderIsolationBranchName(taskName),
        baseBranchName,
    };

    await assertWorktreePathIsGitIgnored(worktree);

    if (await removeCoderIsolationWorktree(worktree)) {
        console.warn(
            colors.yellow(
                `Removed leftovers of an earlier isolated run of \`${taskName}\` before creating a fresh worktree.`,
            ),
        );
    }

    await checkOutWorktree(worktree);
    await copyCoderIsolationEnvironment(worktree);

    return worktree;
}

/**
 * Checks the isolation branch out into the temporary worktree directory.
 *
 * A half-written worktree is removed again so that the failed task neither blocks its own next attempt
 * nor leaves an unusable checkout behind.
 */
async function checkOutWorktree(worktree: CoderIsolationWorktree): Promise<void> {
    try {
        await runGitCommand({
            command: `git worktree add -b "${worktree.branchName}" "${worktree.worktreePath}" HEAD`,
            cwd: worktree.projectPath,
        });
    } catch (error) {
        // Note: The cleanup must never replace the reason why the checkout failed with its own failure
        await removeCoderIsolationWorktree(worktree).catch(() => undefined);

        throw buildCoderIsolationCheckoutFailureError(worktree, formatUnknownErrorMessage(error));
    }
}

/**
 * Ensures the worktree never becomes part of the project it isolates.
 *
 * Without the ignore rule, the nested worktree would be picked up by `git add .` of the very next
 * commit and the whole isolated checkout would be committed as an embedded repository.
 */
async function assertWorktreePathIsGitIgnored(worktree: CoderIsolationWorktree): Promise<void> {
    try {
        await $execCommand({
            command: `git check-ignore --quiet "${worktree.worktreePath}"`,
            cwd: worktree.projectPath,
            isVerbose: false,
        });
    } catch {
        throw new NotAllowed(
            spaceTrim(`
                Flag \`--isolate\` requires \`${getPromptbookTemporaryGitignoreRule()}\` to be git-ignored.

                Isolated worktrees are created inside \`${worktree.worktreeDisplayPath}\`, which is part of the
                project working tree. Unless it is ignored, the whole isolated checkout would be committed
                as an **embedded git repository**.

                Actionable hint:
                - Add \`${getPromptbookTemporaryGitignoreRule()}\` to the project \`.gitignore\` (\`ptbk coder init\` does this for you) and rerun \`ptbk coder run --isolate\`.
            `),
        );
    }
}
