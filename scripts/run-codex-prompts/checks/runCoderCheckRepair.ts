import { spaceTrim } from 'spacetrim';
import type { WorkspaceRepositoryContext } from '../../../src/cli/cli-commands/common/workspaceRepository';
import type { WaitForCoderRunPauseCheckpoint } from '../common/CoderRunPauseCheckpoint';
import {
    captureCoderCommitScope,
    continueCoderCommitScopeOwnership,
    type CoderCommitScope,
} from '../git/coderCommitScope';
import { CoderPhasePersistence } from '../git/CoderPhasePersistence';
import { CoderGitOperationError } from '../git/CoderGitOperationError';
import { ensureWorkingTreeClean } from '../git/ensureWorkingTreeClean';
import type { PromptSelection } from '../prompts/types/PromptSelection';
import { writePromptErrorLog } from '../prompts/writePromptErrorLog';
import { buildCheckBeforeScriptPath } from './buildCheckBeforeScriptPath';
import { CoderCheckFailedError } from './CoderCheckFailedError';
import type { CheckBeforeMode } from './CheckBeforeMode';
import { createCheckBeforeRepairPrompt } from './createCheckBeforeRepairPrompt';
import { limitCheckOutput } from './limitCheckOutput';
import { assertProjectCheckIsConfigured, CoderCheckSetupError } from './projectCheck';
import { runCheckBefore } from './runCheckBefore';
import { CoderCheckExecutionError } from './CoderCheckExecutionError';
import { withCoderWorkspaceLock } from '../common/withCoderWorkspaceLock';
import { relative } from 'path';
import { listWorkingTreeChangedFiles } from '../git/workingTreeChanges';

/** Explicit outcome of a check/repair job, independent of any ordinary prompt queue or terminal. */
export type CoderCheckRepairResult = {
    readonly kind:
        | 'skipped'
        | 'passed-without-repair'
        | 'repaired-and-verified'
        | 'checks-failed'
        | 'setup-error'
        | 'execution-error'
        | 'interrupted'
        | 'persistence-error';
    readonly isCheckPassed: boolean;
    readonly repairPrompt?: PromptSelection;
    readonly error?: unknown;
};

/**
 * Inputs to the shared check/repair phase. The caller owns the workspace mutation lock for its entire lifecycle.
 * Execution is prepared lazily and receives the exact authored selection, never a scheduler result.
 */
export type CoderCheckRepairOptions = {
    readonly projectPath: string;
    readonly workspace?: WorkspaceRepositoryContext;
    readonly checkCommand: string;
    readonly mode: CheckBeforeMode;
    readonly intent: 'run' | 'fix';
    readonly isCommitEnabled: boolean;
    readonly isAutoPushEnabled: boolean;
    readonly isWorkingTreeCleanRequired: boolean;
    readonly preserveLogs?: boolean;
    readonly signal?: AbortSignal;
    readonly ownershipScope?: CoderCommitScope;
    readonly onScopeRetained?: (scope: CoderCommitScope) => void;
    readonly waitForPauseCheckpoint?: WaitForCoderRunPauseCheckpoint;
    readonly onInitialCheckStarted?: () => void;
    readonly onInitialCheckFinished?: () => void;
    readonly onRepairCreated?: (selection: PromptSelection) => Promise<void>;
    readonly prepareRepair: () => Promise<
        (selection: PromptSelection, commitScope?: CoderCommitScope) => Promise<void>
    >;
};

/**
 * Runs the initial check, records its scoped changes and optionally executes one repair with shared feedback.
 * Run may continue its queue after this returns; fix always exits. This service never loads or selects queued work.
 */
export async function runCoderCheckRepair(options: CoderCheckRepairOptions): Promise<CoderCheckRepairResult> {
    if (options.mode === 'no') return { kind: 'skipped', isCheckPassed: false };
    return withCoderWorkspaceLock(options.workspace ?? options.projectPath, () => runOwnedCoderCheckRepair(options), {
        isNestedOwnershipAllowed: true,
    });
}

/** Performs the shared repair lifecycle under the same lease as its direct/run/server caller. */
async function runOwnedCoderCheckRepair(options: CoderCheckRepairOptions): Promise<CoderCheckRepairResult> {
    let repairPrompt: PromptSelection | undefined;
    let isCheckPassed = false;
    let isRepairExecutionStarted = false;
    let persistence: CoderPhasePersistence | undefined;
    try {
        options.signal?.throwIfAborted();
        if (!options.checkCommand?.trim()) {
            throw new CoderCheckSetupError('a check/repair job requires a non-empty selected check command.');
        }
        await assertProjectCheckIsConfigured(options.checkCommand, options.projectPath);
        if (options.isWorkingTreeCleanRequired) {
            await options.waitForPauseCheckpoint?.({
                checkpointLabel: 'checking the git working tree before checking',
                phase: 'loading',
                statusMessage: 'Checking the working tree before checking...',
            });
            await ensureWorkingTreeClean(options.workspace?.repositoryRoot ?? options.projectPath);
        }
        const checkCommitScope = continueCoderCommitScopeOwnership(
            await captureCoderCommitScope(options.workspace ?? options.projectPath, {
                isContentSnapshotRequired: true,
            }),
            options.ownershipScope,
        );
        const excludedPaths = [
            relative(
                checkCommitScope.repositoryRoot ?? options.projectPath,
                buildCheckBeforeScriptPath(options.projectPath),
            ).replace(/\\/gu, '/'),
        ];
        persistence = new CoderPhasePersistence({
            scope: checkCommitScope,
            isCommitEnabled: options.isCommitEnabled,
            isAutoPushEnabled: options.isAutoPushEnabled,
            signal: options.signal,
            excludedPaths,
            onRetained: options.onScopeRetained,
            onPersisted: (result) => {
                if (result.commit)
                    console.info(
                        `Committed ${result.phase} changes: ${result.commit}${
                            result.checkOutcome ? ` (${result.checkOutcome})` : ''
                        }`,
                    );
            },
        });
        options.onInitialCheckStarted?.();
        const checkResult = await runCheckBefore({
            checkCommand: options.checkCommand,
            projectPath: options.projectPath,
            waitForPauseCheckpoint: options.waitForPauseCheckpoint,
            persistence,
            ...(options.preserveLogs ? { preserveLogs: true } : {}),
            ...(options.signal ? { signal: options.signal } : {}),
        }).finally(() => options.onInitialCheckFinished?.());
        options.signal?.throwIfAborted();
        isCheckPassed = checkResult.isPassed;
        await persistence.includeDurableArtifacts(excludedPaths);
        await persistence.finalize(
            spaceTrim(`
            chore: Persist Coder check execution artifacts

            Coder-Phase: finalization
            Coder-Check-Command: ${options.checkCommand}
            Coder-Check-Outcome: ${isCheckPassed ? 'passed' : 'failed'}
            Retained check execution artifacts; task completion is pending genuine verification.
        `),
        );
        await persistence.push();
        if (!options.isCommitEnabled && persistence.outstandingPaths().length) {
            console.info(`Changes retained after checking (uncommitted): ${persistence.outstandingPaths().join(', ')}`);
        }
        if (isCheckPassed) return { kind: 'passed-without-repair', isCheckPassed: true };
        const checkOutput = limitCheckOutput(checkResult.checkOutput);
        if (options.mode === 'yes-and-fail') {
            throw new CoderCheckFailedError(
                spaceTrim(
                    (block) => `
                Pre-coding check command \`${options.checkCommand}\` failed.

                The coding agent was not started because the project was already failing before the first queued prompt.

                ### Check results
                \`\`\`
                ${block(checkOutput)}
                \`\`\`
            `,
                ),
            );
        }
        // Capture before authoring and lazy Book initialization, so the repair's complete write set is eligible.
        const repairCommitScope = continueCoderCommitScopeOwnership(
            await captureCoderCommitScope(options.workspace ?? options.projectPath, {
                isContentSnapshotRequired: true,
            }),
            options.isCommitEnabled ? undefined : persistence.currentCommitScope,
        );
        repairPrompt = await createCheckBeforeRepairPrompt({
            projectPath: options.projectPath,
            checkCommand: options.checkCommand,
            checkOutput,
            ...(options.intent === 'fix' ? { intent: 'fix' as const } : {}),
        });
        await options.onRepairCreated?.(repairPrompt);
        options.signal?.throwIfAborted();
        const executeRepair = await options.prepareRepair();
        options.signal?.throwIfAborted();
        isRepairExecutionStarted = true;
        await executeRepair(repairPrompt, repairCommitScope);
        isCheckPassed = true;
        options.signal?.throwIfAborted();
        return { kind: 'repaired-and-verified', isCheckPassed: true, repairPrompt };
    } catch (error) {
        if (persistence) {
            const failurePath = await persistence.recordFailure(error);
            if (failurePath) console.warn(`Check failure retained in \`${failurePath}\`.`);
            try {
                const paths = await listWorkingTreeChangedFiles(
                    options.workspace?.repositoryRoot ?? options.projectPath,
                );
                if (paths.length)
                    console.warn(`Retained uncommitted changes: ${paths.map((path) => `\`${path}\``).join(', ')}`);
            } catch (inspectionError) {
                console.warn(
                    `Could not inspect retained Git state: ${
                        inspectionError instanceof Error ? inspectionError.message : String(inspectionError)
                    }`,
                );
            }
        }
        if (repairPrompt && !isRepairExecutionStarted) {
            // No model attempt began. Keep the reproducible repair PRD available and persist its setup diagnostic
            // using the same artifact naming as executed repairs, without inventing runner attribution.
            await writePromptErrorLog({
                file: repairPrompt.file,
                section: repairPrompt.section,
                runnerName: 'Check repair setup',
                error,
            });
        }
        return {
            kind: options.signal?.aborted
                ? 'interrupted'
                : error instanceof CoderCheckFailedError
                ? 'checks-failed'
                : error instanceof CoderGitOperationError
                ? 'persistence-error'
                : error instanceof CoderCheckExecutionError
                ? 'execution-error'
                : 'setup-error',
            isCheckPassed:
                error instanceof CoderGitOperationError && error.checkOutcome
                    ? error.checkOutcome === 'passed'
                    : isCheckPassed,
            repairPrompt,
            error,
        };
    }
}
