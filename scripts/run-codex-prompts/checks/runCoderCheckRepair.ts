import { relative } from 'path';
import { spaceTrim } from 'spacetrim';
import type { WorkspaceRepositoryContext } from '../../../src/cli/cli-commands/common/workspaceRepository';
import type { WaitForCoderRunPauseCheckpoint } from '../common/CoderRunPauseCheckpoint';
import { formatUnknownErrorMessage } from '../common/formatUnknownErrorMessage';
import { captureCoderCommitScope, resolveCoderCommitScopePaths, type CoderCommitScope } from '../git/coderCommitScope';
import { CoderGitOperationError } from '../git/CoderGitOperationError';
import { commitChanges } from '../git/commitChanges';
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

/** Commit policy shared by run's pre-coding repair and the finite fix command. */
const PRE_CODING_CHECK_CHANGES_COMMIT_MESSAGE = 'chore: Apply changes made by pre-coding checks';

/** Explicit outcome of a check/repair job, independent of any ordinary prompt queue or terminal. */
export type CoderCheckRepairResult = {
    readonly kind:
        | 'skipped'
        | 'passed-without-repair'
        | 'repaired-and-verified'
        | 'checks-failed'
        | 'setup-error'
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
    let repairPrompt: PromptSelection | undefined;
    let isCheckPassed = false;
    let isRepairExecutionStarted = false;
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
        const checkCommitScope =
            options.mode === 'yes-and-fix' && options.isCommitEnabled
                ? await captureCoderCommitScope(options.workspace ?? options.projectPath)
                : undefined;
        options.onInitialCheckStarted?.();
        const checkResult = await runCheckBefore({
            checkCommand: options.checkCommand,
            projectPath: options.projectPath,
            waitForPauseCheckpoint: options.waitForPauseCheckpoint,
            ...(options.preserveLogs ? { preserveLogs: true } : {}),
            ...(options.signal ? { signal: options.signal } : {}),
        }).finally(() => options.onInitialCheckFinished?.());
        options.signal?.throwIfAborted();
        isCheckPassed = checkResult.isPassed;
        await commitCheckChanges(options, checkCommitScope);
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
        const repairCommitScope = options.isCommitEnabled
            ? await captureCoderCommitScope(options.workspace ?? options.projectPath)
            : undefined;
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
                : 'setup-error',
            isCheckPassed: error instanceof CoderGitOperationError && isRepairExecutionStarted ? true : isCheckPassed,
            repairPrompt,
            error,
        };
    }
}

/** Commits only check-produced files under the existing pre-coding policy, with no empty commits. */
async function commitCheckChanges(options: CoderCheckRepairOptions, scope?: CoderCommitScope): Promise<void> {
    if (!scope) return;
    const checkScriptPath = relative(
        scope.repositoryRoot ?? scope.projectPath,
        buildCheckBeforeScriptPath(options.projectPath),
    ).replace(/\\/gu, '/');
    const relevantPaths = (await resolveCoderCommitScopePaths(scope)).filter(
        (path) => options.preserveLogs || path !== checkScriptPath,
    );
    if (relevantPaths.length === 0) return;
    options.signal?.throwIfAborted();
    await options.waitForPauseCheckpoint?.({
        checkpointLabel: 'committing changes made by pre-coding checks',
        phase: 'checking',
        statusMessage: 'Committing changes made by pre-coding checks...',
    });
    try {
        await commitChanges(PRE_CODING_CHECK_CHANGES_COMMIT_MESSAGE, {
            autoPush: options.isAutoPushEnabled,
            projectPath: scope.repositoryRoot ?? scope.projectPath,
            relevantPaths,
            ...(options.signal ? { signal: options.signal } : {}),
        });
    } catch (error) {
        if (error instanceof CoderGitOperationError) throw error;
        throw new CoderGitOperationError('commit', formatUnknownErrorMessage(error));
    }
}
