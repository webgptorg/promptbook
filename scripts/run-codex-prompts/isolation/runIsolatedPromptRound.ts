import colors from 'colors';
import { dirname, join, relative } from 'path';
import { copyFile, mkdir, realpath } from 'fs/promises';
import { $resolveWorkspaceRepository } from '../../../src/cli/cli-commands/common/workspaceRepository';
import { captureCoderCommitScope } from '../git/coderCommitScope';
import { pushCommittedChanges } from '../git/commitChanges';
import type { RunPromptRoundOptions } from '../main/runPromptRound';
import { runPromptRound } from '../main/runPromptRound';
import { buildPromptRunTracePath } from '../prompts/buildPromptRunTracePath';
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
import { mapProjectReferenceToWorktree } from './mapProjectReferenceToWorktree';
import { resolveCoderProjectContext } from '../common/resolveCoderProjectContext';
import { resolveCoderAgent } from '../common/resolveCoderAgent';
import { DEFAULT_CODER_AGENT_ROLE } from '../../../src/cli/cli-commands/coder/coderAgentRole';
import { withCoderWorkspaceLock } from '../common/withCoderWorkspaceLock';
import { preserveCoderIsolationRecovery } from './preserveCoderIsolationRecovery';
import { buildAgentGitEnv } from '../git/agentGitIdentity';
import { CoderPhasePersistence } from '../git/CoderPhasePersistence';
import { CoderGitOperationError } from '../git/CoderGitOperationError';
import type { CoderCommitScope } from '../git/coderCommitScope';
import { refreshPromptSelection } from '../prompts/refreshPromptSelection';
import { buildPromptErrorLogPath } from '../prompts/writePromptErrorLog';
import { captureCoderIsolationArtifacts, preserveCoderIsolationArtifacts } from './coderIsolationArtifacts';
import {
    beginCoderIsolationIgnoredFiles,
    captureCoderIsolationIgnoredFiles,
    preserveCoderIsolationIgnoredFiles,
} from './coderIsolationIgnoredFiles';

/**
 * Runs one prompt round inside a temporary git worktree and merges the result back afterwards.
 *
 * This is the `--isolate` counterpart of `runPromptRound`, so it accepts exactly the same input:
 * - The coding agent, its check command and the round commit all happen inside the worktree.
 * - Verified phase commits are fast-forwarded back into the caller's branch and the worktree is deleted.
 * - A task which cannot be merged is recorded as failed in the original project and its worktree is kept,
 *   without stopping the coder from processing the next task.
 * - A task whose round fails keeps its worktree too, so the work of the failed round can still be inspected.
 *
 * @private function of runCodexPrompts
 */
export async function runIsolatedPromptRound(options: RunPromptRoundOptions): Promise<void> {
    const projectPath =
        options.projectPath ?? options.options.workspace?.projectPath ?? options.options.projectPath ?? process.cwd();
    return withCoderWorkspaceLock(projectPath, () => runOwnedIsolatedPromptRound(options, projectPath), {
        isNestedOwnershipAllowed: true,
    });
}

/** Holds the original checkout lease across execution, verified integration and recovery cleanup. */
async function runOwnedIsolatedPromptRound(options: RunPromptRoundOptions, projectPath: string): Promise<void> {
    const { nextPrompt, promptLabel, isRichUiEnabled, uiHandle, waitForRequestedPause } = options;
    // Note: The original project is left untouched by the isolated round itself, so its scope covers exactly
    //       the prompt status update and the changes the merge brings back from the worktree
    const originalProjectCommitScope = await captureCoderCommitScope(projectPath, { isContentSnapshotRequired: true });
    const artifactBoundary = await captureCoderIsolationArtifacts(originalProjectCommitScope, nextPrompt);
    // The copied environment remains isolated under the existing policy; wrappers/logs have their own retention.
    let ignoredBoundary = await captureCoderIsolationIgnoredFiles(originalProjectCommitScope, [
        relative(originalProjectCommitScope.repositoryRoot ?? projectPath, join(projectPath, '.env')).replace(
            /\\/gu,
            '/',
        ),
        ...(artifactBoundary?.paths ?? []),
    ]);
    const worktree = await createCoderIsolationWorktree({
        projectPath,
        repositoryRoot: originalProjectCommitScope.repositoryRoot,
        taskName: buildCoderIsolationTaskName(nextPrompt.file, nextPrompt.section),
    });

    announceIsolatedRoundStart(worktree, promptLabel, isRichUiEnabled);

    try {
        ignoredBoundary = await beginCoderIsolationIgnoredFiles(ignoredBoundary, worktree.worktreePath);
        const isolatedProjectPath = join(
            worktree.worktreePath,
            relative(originalProjectCommitScope.repositoryRoot ?? projectPath, projectPath),
        );
        // This newly created working tree has its own metadata. Keep the project's repository-relative
        // location so its harness and check use the same project as the original invocation.
        const isolatedWorkspace = await $resolveWorkspaceRepository(isolatedProjectPath);
        const isolatedOptions = {
            ...options.options,
            workspace: isolatedWorkspace,
            projectPath: isolatedWorkspace.projectPath,
            agent: mapProjectReferenceToWorktree(
                options.options.agent,
                originalProjectCommitScope.repositoryRoot ?? projectPath,
                worktree.worktreePath,
            ),
            context: mapProjectReferenceToWorktree(
                options.options.context,
                originalProjectCommitScope.repositoryRoot ?? projectPath,
                worktree.worktreePath,
            ),
            autoPush: false,
        };
        const projectContext = await resolveCoderProjectContext(isolatedOptions);
        const agent = await resolveCoderAgent(isolatedOptions.agent, isolatedWorkspace.projectPath, {
            defaultRole: DEFAULT_CODER_AGENT_ROLE,
            isInitializationAllowed: false,
        });
        // Status updates, traces and commits belong to the same checkout as the harness and checks.
        // Copy the parsed data too, so a failed isolated round does not mutate the original queue in memory.
        const isolatedFile = {
            ...nextPrompt.file,
            path: join(
                isolatedWorkspace.projectPath,
                relative(originalProjectCommitScope.projectPath, await realpath(nextPrompt.file.path)),
            ),
            lines: [...nextPrompt.file.lines],
            sections: nextPrompt.file.sections.map((section) => ({ ...section })),
        };
        await runPromptRound({
            ...options,
            nextPrompt: { file: isolatedFile, section: isolatedFile.sections[nextPrompt.section.index]! },
            projectPath: isolatedWorkspace.projectPath,
            // Eligible artifacts belong to the same execution history as implementation/check/status changes.
            // Ignored or failed-round logs are retained at their supported original locations before cleanup.
            artifactsProjectPath: isolatedWorkspace.projectPath,
            resolvedCoderContext: projectContext.context,
            resolvedAgentSystemMessage: agent?.systemMessage,
            // Note: The isolated commit must never reach the remote, the merged commit on the original branch is pushed instead
            options: { ...isolatedOptions, projectContext },
        });
        // Keep the display/commit identity in sync without writing to the original checkout before merging.
        const isolatedSection = isolatedFile.sections[nextPrompt.section.index]!;

        await waitForRequestedPause({
            checkpointLabel: 'merging the isolated worktree back',
            phase: 'running',
            statusMessage: `Merging \`${worktree.branchName}\` into \`${worktree.baseBranchName}\``,
        });
        // Retain ignored generated output before integrating the commit which publishes completion.
        await preserveCoderIsolationIgnoredFiles(ignoredBoundary, worktree.worktreePath);
        const mergeResult = await mergeCoderIsolationWorktree(
            worktree,
            originalProjectCommitScope.repositorySnapshot,
            options.signal,
        );
        if (!mergeResult.isMerged) {
            await recordIsolationMergeFailure(
                options,
                worktree,
                mergeResult.failureDetails,
                originalProjectCommitScope,
            );
            return;
        }
        await preserveCoderIsolationArtifacts(artifactBoundary, worktree.worktreePath);
        // Completion belongs to the integrated tree. A rejected push retains verified local completion.
        Object.assign(nextPrompt.section, isolatedSection);
        nextPrompt.file.lines = isolatedFile.lines;
        nextPrompt.file.eol = isolatedFile.eol;
        if (options.options.autoPush)
            await pushCommittedChanges(
                originalProjectCommitScope.repositoryRoot ?? projectPath,
                buildAgentGitEnv(),
                options.signal,
            );
        await preserveCoderIsolationRecovery(worktree);
        await removeCoderIsolationWorktree(worktree);
        uiHandle?.state.setStatusMessage(`Merged \`${worktree.taskName}\` into \`${worktree.baseBranchName}\``);
    } catch (error) {
        try {
            await preserveCoderIsolationArtifacts(artifactBoundary, worktree.worktreePath);
        } catch (artifactError) {
            console.warn(
                `Isolated artifacts remain in \`${worktree.worktreeDisplayPath}\`: ${
                    artifactError instanceof Error ? artifactError.message : String(artifactError)
                }`,
            );
        }
        // Note: The worktree keeps whatever the failed round produced, which would be lost by deleting it here
        console.warn(
            colors.yellow(
                `The isolated worktree \`${worktree.worktreeDisplayPath}\` of the failed task \`${worktree.taskName}\` was kept for inspection.`,
            ),
        );
        throw error;
    }
}

/**
 * Records a failed isolation merge in the original project and keeps the worktree for a manual merge.
 */
async function recordIsolationMergeFailure(
    options: RunPromptRoundOptions,
    worktree: CoderIsolationWorktree,
    failureDetails: string,
    scope: CoderCommitScope,
): Promise<void> {
    const { nextPrompt, runnerMetadata, isRichUiEnabled, uiHandle } = options;
    const mergeFailureError = buildCoderIsolationMergeFailureError(worktree, failureDetails);
    const repositoryRoot = scope.repositoryRoot ?? worktree.projectPath;
    const tracePath = buildPromptRunTracePath(nextPrompt.file, nextPrompt.section);
    const isolatedTracePath = join(worktree.worktreePath, relative(repositoryRoot, tracePath));
    const protectedPaths = scope.repositorySnapshot?.dirtyPaths ?? [];
    if (
        [nextPrompt.file.path, tracePath].some((path) =>
            protectedPaths.includes(toProjectRelativeGitPath(repositoryRoot, path)),
        )
    ) {
        throw new CoderGitOperationError(
            'record',
            'Isolation failure bookkeeping overlaps existing user content. It was left untouched and the execution worktree was retained.',
        );
    }
    const persistence = new CoderPhasePersistence({
        scope,
        isCommitEnabled: !options.options.noCommit,
        isAutoPushEnabled: options.options.autoPush,
        signal: options.signal,
    });
    await persistence.assertRetained();
    await persistence.assertWritablePaths([
        nextPrompt.file.path,
        tracePath,
        buildPromptErrorLogPath(nextPrompt.file.path),
    ]);
    await refreshPromptSelection(nextPrompt);
    // The failed merge did not bring back the worktree's trace. Preserve it beside the failure report.
    await persistence.mutate(async () => {
        await mkdir(dirname(tracePath), { recursive: true });
        try {
            await copyFile(isolatedTracePath, tracePath);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }

        markPromptIsolationMergeFailed(nextPrompt.file, nextPrompt.section, worktree);
        await writePromptFile(nextPrompt.file);
        await writePromptErrorLog({
            file: nextPrompt.file,
            section: nextPrompt.section,
            runnerName: runnerMetadata.runnerName,
            modelName: runnerMetadata.modelName,
            error: mergeFailureError,
        });
    }, 'finalization');
    await persistence.finalize(buildCoderIsolationMergeFailureCommitMessage(worktree));
    await persistence.push();

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
