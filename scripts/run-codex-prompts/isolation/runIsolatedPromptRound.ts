import colors from 'colors';
import { relative } from 'path';
import { captureCoderCommitScope, resolveCoderCommitScopePaths } from '../git/coderCommitScope';
import { commitChanges } from '../git/commitChanges';
import type { RunPromptRoundOptions } from '../main/runPromptRound';
import { runPromptRound } from '../main/runPromptRound';
import { buildCommitMessage } from '../prompts/buildCommitMessage';
import { writePromptErrorLog } from '../prompts/writePromptErrorLog';
import { writePromptFile } from '../prompts/writePromptFile';
import type { CoderIsolationWorktree } from './CoderIsolationWorktree';
import {
    buildCoderIsolationMergeFailureCommitMessage,
    buildCoderIsolationMergeFailureError,
} from './coderIsolationMergeFailureReport';
import { buildCoderIsolationTaskName } from './coderIsolationNaming';
import { createCoderIsolationWorktree } from './createCoderIsolationWorktree';
import { markPromptIsolationMergeFailed } from './markPromptIsolationMergeFailed';
import { mergeCoderIsolationWorktree } from './mergeCoderIsolationWorktree';
import { removeCoderIsolationWorktree } from './removeCoderIsolationWorktree';

/**
 * Runs one prompt round inside a temporary git worktree and merges the result back afterwards.
 *
 * This is the `--isolate` counterpart of `runPromptRound`, so it accepts exactly the same input:
 * - The coding agent, its verification command and the round commit all happen inside the worktree.
 * - A verified task is squash-merged back into the branch the coder runs on and the worktree is deleted.
 * - A task which cannot be merged is recorded as failed in the original project and its worktree is kept,
 *   without stopping the coder from processing the next task.
 * - A task whose round fails keeps its worktree too, so the work of the failed round can still be inspected.
 *
 * @private function of runCodexPrompts
 */
export async function runIsolatedPromptRound(options: RunPromptRoundOptions): Promise<void> {
    const { nextPrompt, promptLabel, isRichUiEnabled, uiHandle, waitForRequestedPause } = options;
    const projectPath = options.projectPath ?? process.cwd();
    // Note: The original project is left untouched by the isolated round itself, so its scope covers exactly
    //       the prompt status update and the changes the merge brings back from the worktree
    const originalProjectCommitScope = await captureCoderCommitScope(projectPath);
    const worktree = await createCoderIsolationWorktree({
        projectPath,
        taskName: buildCoderIsolationTaskName(nextPrompt.file, nextPrompt.section),
    });

    announceIsolatedRoundStart(worktree, promptLabel, isRichUiEnabled);

    try {
        await runPromptRound({
            ...options,
            projectPath: worktree.worktreePath,
            // Note: The isolated commit must never reach the remote, the merged commit on the original branch is pushed instead
            options: { ...options.options, autoPush: false },
        });
    } catch (error) {
        // Note: The worktree keeps whatever the failed round produced, which would be lost by deleting it here
        console.warn(
            colors.yellow(
                `The isolated worktree \`${worktree.worktreeDisplayPath}\` of the failed task \`${worktree.taskName}\` was kept for inspection.`,
            ),
        );
        throw error;
    }

    await waitForRequestedPause({
        checkpointLabel: 'merging the isolated worktree back',
        phase: 'running',
        statusMessage: `Merging \`${worktree.branchName}\` into \`${worktree.baseBranchName}\``,
    });

    const mergeResult = await mergeCoderIsolationWorktree(worktree);

    if (!mergeResult.isMerged) {
        await recordIsolationMergeFailure(options, worktree, mergeResult.failureDetails);
        return;
    }

    // Note: The merge only stages the isolated changes, so this commit joins them with the prompt status update
    await commitChanges(buildCommitMessage(nextPrompt.file, nextPrompt.section), {
        autoPush: options.options.autoPush,
        relevantPaths: await resolveCoderCommitScopePaths(originalProjectCommitScope),
        projectPath,
    });
    await removeCoderIsolationWorktree(worktree);

    uiHandle?.state.setStatusMessage(`Merged \`${worktree.taskName}\` into \`${worktree.baseBranchName}\``);
}

/**
 * Records a failed isolation merge in the original project and keeps the worktree for a manual merge.
 */
async function recordIsolationMergeFailure(
    options: RunPromptRoundOptions,
    worktree: CoderIsolationWorktree,
    failureDetails: string,
): Promise<void> {
    const { nextPrompt, runnerMetadata, isRichUiEnabled, uiHandle } = options;
    const mergeFailureError = buildCoderIsolationMergeFailureError(worktree, failureDetails);

    markPromptIsolationMergeFailed(nextPrompt.file, nextPrompt.section, worktree);
    await writePromptFile(nextPrompt.file);
    const errorLogPath = await writePromptErrorLog({
        file: nextPrompt.file,
        section: nextPrompt.section,
        runnerName: runnerMetadata.runnerName,
        modelName: runnerMetadata.modelName,
        error: mergeFailureError,
    });

    await commitChanges(buildCoderIsolationMergeFailureCommitMessage(worktree), {
        autoPush: options.options.autoPush,
        projectPath: worktree.projectPath,
        relevantPaths: [nextPrompt.file.path, errorLogPath].map((path) =>
            toProjectRelativeGitPath(worktree.projectPath, path),
        ),
    });

    uiHandle?.state.addError(mergeFailureError.message);
    uiHandle?.state.setStatusMessage(`Merging \`${worktree.taskName}\` failed, worktree kept for a manual merge`);

    if (!isRichUiEnabled) {
        console.error(colors.red(mergeFailureError.message));
    }
}

/**
 * Prints where an isolated task is being implemented when the rich terminal UI is disabled.
 */
function announceIsolatedRoundStart(
    worktree: CoderIsolationWorktree,
    promptLabel: string,
    isRichUiEnabled: boolean,
): void {
    if (isRichUiEnabled) {
        return;
    }

    console.info(colors.gray(`Isolating ${promptLabel} in worktree ${worktree.worktreeDisplayPath}`));
}

/**
 * Converts one absolute path into the repository-relative form expected by git pathspecs.
 */
function toProjectRelativeGitPath(projectPath: string, path: string): string {
    return relative(projectPath, path).replace(/\\/gu, '/');
}
